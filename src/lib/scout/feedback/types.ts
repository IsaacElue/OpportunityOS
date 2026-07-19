export type ScoutFeedbackType = "interested" | "rejected" | "saved" | "explored";

export type ScoutFeedback = {
  id: string;
  organization_id: string;
  user_id: string;
  opportunity_id: string;
  feedback_type: ScoutFeedbackType;
  note: string | null;
  created_at: string;
};

export type SaveScoutFeedbackInput = {
  organization_id: string;
  user_id: string;
  opportunity_id: string;
  feedback_type: ScoutFeedbackType;
  note?: string | null;
};

export type GetScoutFeedbackInput = {
  organization_id: string;
  opportunity_id?: string;
};
