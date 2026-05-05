export interface AdminSignUpForm {
  step1: {
    email: string;
    password: string;
    confirmPassword: string;
  };
  step2: {
    projectName: string;
    projectDescription: string;
  };
}
