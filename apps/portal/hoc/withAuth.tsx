import Cookies from "js-cookie";
import { useRouter } from "next/router";
import { ComponentType, useEffect, useState } from "react";

import { CookiesEnum } from "@/enums/cookies";

// Define a generic HOC that can accept any component type
function withAuth<T extends React.JSX.IntrinsicAttributes>(
  WrappedComponent: ComponentType<T>
) {
  // Return a new component that takes T as props
  return function WithAuthComponent(props: T) {
    const router = useRouter();
    const [isLoaded, setIsLoaded] = useState<boolean>(false);

    useEffect(() => {
      if (!Cookies.get(CookiesEnum.AccessToken)) {
        router.push("/");
        return;
      }
      setIsLoaded(true);
    }, [router]);

    if (!isLoaded) return null;

    // Pass along all props to the wrapped component
    return <WrappedComponent {...props} />;
  };
}

export default withAuth;
