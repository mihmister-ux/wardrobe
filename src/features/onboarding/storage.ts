/** Флаг в localStorage: показывать ли онбординг при первом запуске. */
const ONBOARDING_KEY = "wardrobe_onboarded";

/** Был ли онбординг уже показан (и закрыт) на этом устройстве. */
export function hasOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "true";
  } catch {
    // localStorage может быть недоступен (приватный режим) — считаем, что не показывали.
    return false;
  }
}

/** Записать флаг, чтобы онбординг больше не показывался. */
export function markOnboarded(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, "true");
  } catch {
    // Не получилось сохранить — просто пропускаем, онбординг покажется снова.
  }
}