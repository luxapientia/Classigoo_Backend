export class ExamGradeDto {
  id: string;
  exam: {
    id: string;
    title: string;
    status: string;
    duration: number;
    questions: any[];
    created_at: Date;
    start_once: boolean;
  };
  status: string;
  user_id: string;
  exam_id: string;
  markings: any[];
  created_at: Date;
  updated_at: Date;
} 