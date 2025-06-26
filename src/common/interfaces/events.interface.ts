export interface EventPayload<T = any> {
  data: T;
  timestamp: number;
  eventType: string;
}

export interface EventSubscriber {
  event: string;
  callback: (payload: EventPayload) => void;
}

export enum EventTypes {
  CHATROOM_CREATED = 'chatroom.created',
  ASSIGNMENT_UPATED = 'assignment.updated',
  ASSIGNMENT_SUBMISSION_UPDATED = 'assignment_submission.updated',
  MESSAGE_CREATED = 'message.created',
  MESSAGE_UPDATED = 'message.updated',
  MESSAGE_DELETED = 'message.deleted',
  CLASSROOM_UPDATED = 'classroom.updated',
  CLASSROOM_MEMBER_UPDATED = 'classroom.member.updated',
  EXAM_UPDATED = 'exam.updated',
  POST_UPDATED = 'post.updated',
  SCHEDULE_UPDATED = 'schedule.updated'
} 