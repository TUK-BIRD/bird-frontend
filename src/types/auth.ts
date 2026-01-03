export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  passwordConfirmation: string;
  name: string;
  spaceName: string;
  spaceDescription: string;
}

