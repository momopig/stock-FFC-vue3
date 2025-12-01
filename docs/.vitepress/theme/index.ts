import DefaultTheme from 'vitepress/theme'
import { useRouter } from 'vitepress'
import imageViewer from 'vitepress-plugin-image-viewer'
import 'viewerjs/dist/viewer.css'

export default {
  ...DefaultTheme,
  setup() {
    const router:any = useRouter()
    imageViewer(router)
  }
}
