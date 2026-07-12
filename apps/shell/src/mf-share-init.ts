import * as authShare from "../../../packages/auth/src/index"
import * as authStoreShare from "../../../packages/auth/src/store"
import * as stepUpChannelShare from "../../../packages/auth/src/step-up-channel"
import * as i18nShare from "../../../packages/i18n/src/index"
import * as notificationsShare from "../../../packages/notifications/src/index"
import * as reactToastifyShare from "react-toastify"
import * as themeShare from "../../../packages/theme/src/index"

const mfCache = ((
  globalThis as typeof globalThis & {
    __mf_module_cache__?: {
      share: Record<string, unknown>
      remote: Record<string, unknown>
    }
  }
).__mf_module_cache__ ??= { share: {}, remote: {} })

function seedShare(key: string, value: unknown) {
  mfCache.share[`default:${key}`] ??= value
  mfCache.share[key] ??= value
}

// Must run before any lazy chunk (App) evaluates federation loadShare imports.
seedShare("@workspace/auth", authShare)
seedShare("@workspace/auth/store", authStoreShare)
seedShare("@workspace/auth/step-up-channel", stepUpChannelShare)
seedShare("@workspace/theme", themeShare)
seedShare("@workspace/notifications", notificationsShare)
seedShare("@workspace/i18n", i18nShare)
seedShare("react-toastify", reactToastifyShare)
