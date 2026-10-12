import { createRemoteMain } from "@workspace/federation-runtime/standalone"
import RemoteRoutes from "./Routes"

createRemoteMain({ Routes: RemoteRoutes })
