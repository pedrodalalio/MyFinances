declare module "*.tsx" {
  import { ComponentType } from "react";
  const Component: ComponentType<any>;
  export default Component;
}