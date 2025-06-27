import { Controller, Post, Body, Headers, Req, UseGuards, Get, Param } from '@nestjs/common';
import { Request } from 'express';
import { UserGuard } from '../../shared/guards/user.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/user.decorator';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { ManageSubscriptionDto } from './dto/manage-subscription.dto';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';

@Controller('v1/subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get(':userId')
  @UseGuards(UserGuard)
  async getSubscriptions(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionService.getSubscriptions(userId, user);
  }

  @Post('create')
  @UseGuards(UserGuard)
  async createSubscription(
    @CurrentUser() user: JwtPayload,
    @Body() createSubscriptionDto: CreateSubscriptionDto,
  ) {
    return this.subscriptionService.createSubscription(createSubscriptionDto, user);
  }

  @Post('manage')
  @UseGuards(UserGuard)
  async manageSubscription(
    @CurrentUser() user: JwtPayload,
    @Body() manageSubscriptionDto: ManageSubscriptionDto,
  ) {
    return this.subscriptionService.manageSubscription(manageSubscriptionDto, user);
  }

  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: Request,
  ) {
    return this.subscriptionService.handleWebhook(signature, request.body as Buffer);
  }
} 