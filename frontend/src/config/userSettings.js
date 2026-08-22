const STORAGE_KEY = "default_user_password";
export const FALLBACK_DEFAULT_PASSWORD = "123456";

export function getDefaultUserPassword() {
  return localStorage.getItem(STORAGE_KEY) || FALLBACK_DEFAULT_PASSWORD;
}

export function setDefaultUserPassword(password) {
  localStorage.setItem(STORAGE_KEY, password);
  window.dispatchEvent(
    new CustomEvent("default-password-changed", { detail: password }),
  );
}

export function createUserFormDefaults() {
  return {
    name: "",
    email: "",
    password: getDefaultUserPassword(),
    phone_number: "",
    zone_code: "",
    date_of_birth: "",
    role: "",
    roles: [],
  };
}
