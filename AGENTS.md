# MathConcept demo conventions

- Parent and Student interfaces use **Hong Kong Traditional Chinese (`zh-HK`)** by default, including new features, dialogs, validation, accessibility labels, sample learning content and PWA metadata. Use natural Hong Kong wording: 家長、學生、老師、課堂、補堂、工作紙、繳費、收據、付款證明.
- Parent layouts target phones; Student layouts target large tablets such as iPad Pro.
- Admin and Teacher interfaces remain English unless the user requests otherwise. Shared components must choose copy by role.
- Use the explicit family locale helpers or Chinese source strings in family-only screens. Preserve identifiers, action names, canonical model values, mathematical notation, names and uploaded filenames. Do not translate or overwrite user-authored messages, notes or worksheet answers.
- Keep the demo frontend-only. Local data does not sync across devices. OCR/payment checks remain explicitly simulated.
- Tsuen Wan (`/`) and Hang Hau (`/hh/`) share all application and workflow code. Future changes apply to both. Use `branch-config.js` for branch identity/teachers/paths; keep their saved demo data and family PWA identities separate. Preserve existing Tsuen Wan browser data.
- New locally imported modules and essential artwork must be added to the service worker cache. Bump its cache version when the asset set changes.
- Run `npm run check` and `npm test`; check changed family flows at phone/tablet widths before publishing. Vercel deploys `dist/` from `main`.
