export class UserDto {
  id: string;
  email: string;
  name: string;
  avatar: string;
  is_plus: boolean;
}

export class SubscriptionResponseDto {
  user: UserDto;
  children_count: number;
  parents_count: number;
  children: UserDto[];
} 