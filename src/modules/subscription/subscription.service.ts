import { Injectable, BadRequestException, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as moment from 'moment';
import Stripe from 'stripe';

import { User, UserDocument } from '../auth/schemas/user.schema';
import { ChildParent, ChildParentDocument } from './schemas/child-parent.schema';
import { Notification } from '../classroom/member/schemas/notification.schema';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { ManageSubscriptionDto } from './dto/manage-subscription.dto';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';
import { JwtPayload } from '../../common/decorators/user.decorator';

@Injectable()
export class SubscriptionService {
  private stripe: Stripe;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(ChildParent.name) private childParentModel: Model<ChildParentDocument>,
    @InjectModel(Notification.name) private notificationModel: Model<Notification>,
    private configService: ConfigService,
  ) {
    this.stripe = new Stripe(this.configService.get<string>('env.stripe.secretKey') || '', {
      apiVersion: '2024-12-18.acacia',
    });
  }

  async getSubscriptions(userId: string, currentUser: JwtPayload): Promise<SubscriptionResponseDto> {
    try {
      if (userId !== currentUser.user_id) {
        const parentChildRelation = await this.childParentModel.findOne({
          parent_id: currentUser.user_id,
          child_id: userId,
          status: 'accepted',
        });

        if (!parentChildRelation) {
          throw new UnauthorizedException('You are not allowed to get subscriptions for this user');
        }
      }

      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      const [childCount, parentCount] = await Promise.all([
        this.childParentModel.countDocuments({
          parent_id: userId,
          status: 'accepted',
        }),
        this.childParentModel.countDocuments({
          child_id: userId,
          status: 'accepted',
        })
      ]);

      const childrenData = await this.childParentModel.aggregate([
        {
          $match: {
            parent_id: userId,
            status: 'accepted',
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'child_id',
            foreignField: '_id',
            as: 'child',
          },
        },
        {
          $unwind: '$child',
        },
        {
          $project: {
            _id: 0,
            id: '$child._id',
            email: '$child.email',
            name: '$child.name',
            avatar: '$child.avatar',
            is_plus: '$child.is_plus',
          },
        }
      ]);

      return {
        user: {
          id: user._id?.toString() as string,
          email: user.email,
          name: user.name,
          avatar: user.avatar?.url,
          is_plus: user.is_plus,
        },
        children_count: childCount,
        parents_count: parentCount,
        children: childrenData,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to get subscriptions');
    }
  }

  private async createNotification(userId: string, content: string) {
    await this.notificationModel.create({
      user_id: userId,
      content,
      image: this.configService.get<string>('env.notification.subscriptionImageUrl'),
      link: '/subscriptions',
      is_read: false,
    });
  }

  async createSubscription(createSubscriptionDto: CreateSubscriptionDto, currentUser: JwtPayload) {
    try {
      const { id: userToSubscribe, plan } = createSubscriptionDto;
      const currentUserId = currentUser.user_id;

      if (plan !== 'monthly' && plan !== 'yearly') {
        throw new BadRequestException('Invalid plan');
      }

      const selectedPlan = plan === 'monthly'
        ? this.configService.get<string>('env.stripe.monthlySubscriptionPriceId')
        : this.configService.get<string>('env.stripe.yearlySubscriptionPriceId');

      // Check if user has permission
      if (currentUserId !== userToSubscribe) {
        const parentChildRelation = await this.childParentModel.findOne({
          parent_id: currentUserId,
          child_id: userToSubscribe,
          status: 'accepted',
        });

        if (!parentChildRelation) {
          throw new UnauthorizedException('You are not allowed to manage subscription for this user');
        }
      }

      // Get user
      const user = await this.userModel.findById(userToSubscribe);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      let stripeCustomerId = user.subscription?.stripe_customer_id;

      if (!stripeCustomerId) {
        // Create new customer
        const customer = await this.stripe.customers.create({
          name: user.name,
          email: user.email,
        });

        // Update user with stripe customer id
        await this.userModel.findByIdAndUpdate(userToSubscribe, {
          'subscription.stripe_customer_id': customer.id,
        });

        stripeCustomerId = customer.id;
      }

      if (!user.is_plus) {
        // Create checkout session
        const session = await this.stripe.checkout.sessions.create({
          mode: 'subscription',
          payment_method_types: ['card'],
          line_items: [
            {
              price: selectedPlan,
              quantity: 1,
            },
          ],
          customer: stripeCustomerId,
          success_url: `${this.configService.get<string>('env.frontendUrl')}/subscriptions?status=success`,
          cancel_url: `${this.configService.get<string>('env.frontendUrl')}/subscriptions?status=cancel`,
        });

        await this.createNotification(
          userToSubscribe,
          'Your Classigoo Plus subscription checkout session has been created',
        );

        return {
          status: 'success',
          message: 'Session created',
          url: session.url,
        };
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to create subscription');
    }
  }

  async manageSubscription(manageSubscriptionDto: ManageSubscriptionDto, currentUser: JwtPayload) {
    try {
      const { id: userToManage } = manageSubscriptionDto;
      const currentUserId = currentUser.user_id;

      // Check if user has permission
      if (currentUserId !== userToManage) {
        const parentChildRelation = await this.childParentModel.findOne({
          parent_id: currentUserId,
          child_id: userToManage,
          status: 'accepted',
        });

        if (!parentChildRelation) {
          throw new UnauthorizedException('You are not allowed to manage subscription for this user');
        }
      }

      // Get user
      const user = await this.userModel.findById(userToManage);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      const stripeCustomerId = user.subscription?.stripe_customer_id;

      if (!stripeCustomerId) {
        throw new BadRequestException('User does not have any active subscription');
      }

      if (user.is_plus) {
        // Generate portal session
        const session = await this.stripe.billingPortal.sessions.create({
          customer: stripeCustomerId,
          return_url: `${this.configService.get<string>('env.frontendUrl')}/subscriptions`,
        });

        await this.createNotification(
          userToManage,
          'Your Classigoo Plus subscription management portal is ready',
        );

        return {
          status: 'success',
          message: 'Subscription portal session created',
          url: session.url,
        };
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to manage subscription');
    }
  }

  async handleWebhook(signature: string, rawBody: Buffer) {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.configService.get<string>('env.stripe.webhookSecret') || '',
      );
    } catch (err) {
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    const returned = event.data.object as any;

    // Get user by stripe customer id
    const user = await this.userModel.findOne({
      'subscription.stripe_customer_id': returned.customer,
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    console.log(`Processing event ${event.type} for user ${user.email}`);

    switch (event.type) {
      case 'checkout.session.completed':
        if (returned.mode === 'subscription' && returned.payment_status === 'paid') {
          await this.updateSubscriptionStatus(user._id?.toString() as string, {
            is_plus: true,
            'subscription.stripe_subscription_id': returned.subscription,
            'subscription.current_period_start': moment.unix(returned.created).toDate(),
            'subscription.current_period_end': moment.unix(returned.expires_at).toDate(),
          });
          await this.createNotification(
            user._id?.toString() as string,
            'Your Classigoo Plus subscription is now active',
          );
        }
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        if (returned.status === 'active') {
          await this.updateSubscriptionStatus(user._id?.toString() as string, {
            is_plus: true,
            'subscription.stripe_subscription_id': returned.id,
            'subscription.current_period_start': moment.unix(returned.current_period_start).toDate(),
            'subscription.current_period_end': moment.unix(returned.current_period_end).toDate(),
          });
          await this.createNotification(
            user._id?.toString() as string,
            'Your Classigoo Plus subscription is now active',
          );
        }
        break;

      case 'customer.subscription.deleted':
        await this.updateSubscriptionStatus(user._id?.toString() as string, {
          is_plus: false,
          'subscription.stripe_subscription_id': null,
          'subscription.current_period_start': null,
          'subscription.current_period_end': null,
        });
        await this.createNotification(
          user._id?.toString() as string,
          'Your Classigoo Plus subscription is downgraded to free',
        );
        break;

      case "invoice.payment_succeeded":
        break;
  
      case "invoice.payment_failed":
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return { received: true };
  }

  private async updateSubscriptionStatus(userId: string, update: any) {
    await this.userModel.findByIdAndUpdate(userId, update);
  }
} 