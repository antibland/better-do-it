export type Comment = {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  readAt: string | null;
  isRead: 0 | 1;
};

export type CommentWithAuthor = Comment & {
  authorName: string;
  authorEmail: string;
};
