# Авторизация Givvy (Firebase Auth)

Вход: Google, email + пароль, Sign in with Apple. Без настроенного Firebase приложение
работает как раньше, в гостевом режиме.

## Как устроено

- `src/auth/config.ts` — читает конфиг Firebase из `VITE_FIREBASE_*`.
- `src/auth/firebase.ts` — лениво грузит SDK, `initializeAuth` с IndexedDB-персистентностью
  (её же Firebase рекомендует внутри Capacitor WebView).
- `src/auth/providers.ts` — все способы входа в одном месте. Сейчас Google/Apple идут через
  `signInWithPopup` (на GitHub Pages redirect-вход ломается из-за разных доменов).
- `src/auth/AuthContext.tsx` — состояние сессии (`disabled | loading | guest | signed-in`).
- `src/pages/Account.tsx` — экран `#/account`; ссылка есть в Settings и на первом экране онбординга.
- Локальные данные (в т.ч. из онбординга) при входе не трогаются. При переходе на Firestore
  они будут загружены в аккаунт по `uid`.

### Capacitor (позже)
В WebView попапы не работают, а Apple требует нативный Sign in with Apple. План: подключить
`@capacitor-firebase/authentication` (`skipNativeAuth: true`), получать токен нативно и
передавать в `signInWithCredential` на этом же JS-инстансе Auth. Меняются только тела
`signInWithGoogle` / `signInWithApple` в `providers.ts`; `uid`, email-вход и остальной код
остаются как есть.

## Что настроить руками

1. **Firebase console** → Add project (Analytics можно выключить).
2. Project settings → General → Your apps → **Web app** → скопировать конфиг.
3. **Authentication → Sign-in method**: включить *Email/Password* и *Google*
   (указать support email).
4. **Authentication → Settings → Authorized domains**: добавить `littleshiver.github.io`
   (`localhost` уже есть).
5. **Apple** (нужен Apple Developer Program, $99/год):
   - Certificates, IDs & Profiles → Identifiers → App ID с включённым *Sign in with Apple*
     (тот же bundle id, что будет у iOS-приложения).
   - Identifiers → **Services ID** (например `com.givvy.web`), включить Sign in with Apple,
     Domains: `<project-id>.firebaseapp.com`, Return URL:
     `https://<project-id>.firebaseapp.com/__/auth/handler`.
   - Keys → новый ключ с Sign in with Apple → скачать `.p8`, запомнить Key ID и Team ID.
   - В Firebase: Sign-in method → **Apple** → Services ID, Team ID, Key ID, приватный ключ.
6. **Ключи**: конфиг проекта `givvy-f9887` лежит в `.env.production` и `.env.development`
   (это публичные идентификаторы, не секреты). Для другого проекта переопределите их в
   `.env.local`.
