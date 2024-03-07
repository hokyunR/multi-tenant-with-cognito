import { Amplify } from "aws-amplify"
import { withAuthenticator } from "@aws-amplify/ui-react"

import "@aws-amplify/ui-react/styles.css"

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: "ap-northeast-2_1dypnWVDQ",
      userPoolClientId: "5j58d31e2b1u9sm2a9t4qp4571",
    },
  },
})

function App() {
  return <div>Hello</div>
}

export default withAuthenticator(App)
