import { CCard, CCardBody, CCol, CContainer, CRow } from "@coreui/react";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

/** Centered card used by the sign-in, forgotten-password and reset-password screens. */
const AuthLayout = ({ title, subtitle, children }: Props) => (
  <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
    <CContainer>
      <CRow className="justify-content-center">
        <CCol md={7} lg={5} xl={4}>
          <div className="text-center mb-4">
            <div
              className="d-inline-flex align-items-center justify-content-center rounded-3 bg-primary text-white fw-bold mb-3"
              style={{ width: 56, height: 56, fontSize: 18 }}
            >
              CPR
            </div>
            <div className="text-body-secondary small">Charter Property Repair · Admin</div>
          </div>
          <CCard className="border-0 shadow-sm">
            <CCardBody className="p-4">
              <h1 className="h4 mb-1">{title}</h1>
              {subtitle && <p className="text-body-secondary mb-3">{subtitle}</p>}
              {children}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </CContainer>
  </div>
);

export default AuthLayout;
