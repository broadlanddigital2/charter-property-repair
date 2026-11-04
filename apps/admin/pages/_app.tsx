import { useEffect } from "react";
import type { AppProps } from "next/app";
import { observer } from "mobx-react-lite";
import { ToastContainer } from "react-toastify";

import Loader from "@/components/Loader";
import { useStores } from "@/hooks/useStores";
import { setUnauthenticatedHandler } from "@/services/supabase";

import "@coreui/coreui/dist/css/coreui.min.css";
import "@/styles/globals.css";
import 'react-toastify/dist/ReactToastify.css';

function App({ Component, pageProps }: AppProps) {
  const { authStore, loaderStore } = useStores();

  useEffect(() => {
    setUnauthenticatedHandler(() => authStore.logout());
    authStore.initStore();
  }, [])

  return (
    <>
      {loaderStore.getLoading && <Loader />}
      <Component {...pageProps} />
      <ToastContainer position="top-right" />
    </>
  );
}

export default observer(App);
