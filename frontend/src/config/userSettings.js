const STORAGE_KEY = "default_user_password";
export const FALLBACK_DEFAULT_PASSWORD = "Demo123!";

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
    role: "recorder",
    roles: ["recorder"],
  };
}
