import { Injectable, UnauthorizedException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { JwtPayload } from '../../common/decorators/user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { ProcessedFile } from '../classroom/common/interfaces/response.interface';
import { FileService } from '../../shared/services/file.service';

@Injectable()
export class AccountService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private fileService: FileService,
  ) {}

  async getProfile(userId: string, user: JwtPayload): Promise<User> {
    if (user.user_id !== userId) {
      throw new UnauthorizedException('You are not authorized to access this resource');
    }

    const userData = await this.userModel.findById(userId);
    if (!userData) {
      throw new NotFoundException('User not found');
    }
    return userData;
  }

  async uploadAvatar(files: Array<ProcessedFile>, user: JwtPayload): Promise<boolean> {
    try {
      const userData = await this.userModel.findById(user.user_id);
      if (!userData) {
        throw new NotFoundException('User not found');
      }

      const avatarFile = files[0];

      if (userData.avatar.bucketKey) {
        await this.fileService.deleteFile(userData.avatar.bucketKey);
      }

      userData.avatar = {
        bucketKey: avatarFile.key,
        url: avatarFile.signedUrl,
      };

      await userData.save();

      return true;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to upload avatar');
    }
  }

  async updateProfile(userId: string, updateData: UpdateProfileDto, user: JwtPayload): Promise<boolean> {
    if (user.user_id !== userId) {
      throw new UnauthorizedException('You are not authorized to access this resource');
    }

    const result = await this.userModel.updateOne(
      { _id: userId },
      { $set: updateData }
    );
    return result.modifiedCount > 0;
  }

  async updateAddress(userId: string, address: UpdateAddressDto, user: JwtPayload): Promise<boolean> {
    if (user.user_id !== userId) {
      throw new UnauthorizedException('You are not authorized to access this resource');
    }

    const result = await this.userModel.updateOne(
      { _id: userId },
      { $set: { address } }
    );
    return result.modifiedCount > 0;
  }
} 