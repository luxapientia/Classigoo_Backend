export interface ListMessageRecipientsResponse {
  id: string;
  name: string;
  type: string;
  users: {
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
      avatar: object;
      role: string;
    };
  }[];
} 