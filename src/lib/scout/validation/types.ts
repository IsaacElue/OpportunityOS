export type ScoutValidationCheck = {
  name: string;
  passed: boolean;
  message: string;
};

export type ValidateScoutAutonomousWorkflowInput = {
  organization_id: string;
  objective_id?: string;
};

export type ScoutAutonomousValidationResult = {
  passed: boolean;
  checks: ScoutValidationCheck[];
};
