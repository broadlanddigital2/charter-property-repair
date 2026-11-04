import { CSpinner } from "@coreui/react";

const Loader = () => {
  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ zIndex: 2000, background: "rgba(255,255,255,0.55)", backdropFilter: "blur(1px)" }}
    >
      <CSpinner color="primary" />
      <span className="visually-hidden">Loading...</span>
    </div>
  );
};

export default Loader;
