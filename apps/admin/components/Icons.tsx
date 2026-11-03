import { SVGProps } from "react";

export type IconProps = {
  color?: string;
  width?: number | string;
  height?: number | string;
  size?: number | string;
} & SVGProps<SVGSVGElement>;

export const Icons = {
  User: (props: IconProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.width || props.size || "24px"}
      height={props.height || props.size || "24px"}
      viewBox="0 0 30.162 34.318"
      {...props}
    >
      <g data-name="user (1)">
        <g data-name="Group 105">
          <g data-name="Group 104">
            <path
              d="M15.081 0a9.049 9.049 0 1 0 9.051 9.049A9.059 9.059 0 0 0 15.081 0Zm0 16.086a7.038 7.038 0 1 1 7.038-7.038 7.046 7.046 0 0 1-7.038 7.038Z"
              data-name="Path 181"
            />
          </g>
        </g>
        <g data-name="Group 107">
          <g data-name="Group 106">
            <path
              d="M26.339 24.008a12.9 12.9 0 0 0-9.247-3.9H13.07a12.9 12.9 0 0 0-9.247 3.9A13.187 13.187 0 0 0 0 33.308a1 1 0 0 0 1.005 1.005h28.152a1 1 0 0 0 1.005-1.005 13.187 13.187 0 0 0-3.823-9.3Zm-24.284 8.3A11.127 11.127 0 0 1 13.07 22.119h4.022a11.127 11.127 0 0 1 11.015 10.189Z"
              data-name="Path 182"
            />
          </g>
        </g>
      </g>
    </svg>
  ),
  Customers: (props: IconProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.width || props.size || "24px"}
      height={props.height || props.size || "24px"}
      viewBox="0 0 102.44 102.438"
      {...props}
    >
      <path d="M35.565 24.053a2.256 2.256 0 0 0 .738 2.473l6.609 5.312-2.225 8.183a2.273 2.273 0 0 0 3.438 2.5l7.095-4.644 7.1 4.645a2.273 2.273 0 0 0 3.437-2.5l-2.225-8.183 6.609-5.312a2.272 2.272 0 0 0-1.313-4.041l-8.47-.413-3.01-7.927a2.272 2.272 0 0 0-4.249 0l-3.01 7.928-8.469.413a2.255 2.255 0 0 0-2.051 1.568Zm11.284 1.187a2.271 2.271 0 0 0 2.014-1.463l2.358-6.209 2.358 6.21a2.273 2.273 0 0 0 2.014 1.463l6.634.324-5.177 4.161a2.272 2.272 0 0 0-.769 2.367l1.74 6.407-5.557-3.638a2.273 2.273 0 0 0-2.489 0L44.418 38.5l1.742-6.409a2.272 2.272 0 0 0-.769-2.368l-5.177-4.161Zm2.77-17.766V1.6a1.6 1.6 0 1 1 3.2 0v5.874a1.6 1.6 0 1 1-3.2 0Zm9.747 9.483a1.6 1.6 0 0 1 .118-2.26L66.031 8.8a1.6 1.6 0 1 1 2.142 2.379l-6.546 5.894a1.6 1.6 0 0 1-2.26-.118ZM34.149 8.922a1.6 1.6 0 0 1 2.257-.122l6.549 5.9a1.6 1.6 0 0 1-2.142 2.379l-6.546-5.894a1.6 1.6 0 0 1-.118-2.26Zm37.606 17.6 6.609 5.312-2.225 8.183a2.273 2.273 0 0 0 3.438 2.5l7.095-4.644 7.1 4.645a2.273 2.273 0 0 0 3.437-2.5l-2.225-8.183 6.609-5.312a2.273 2.273 0 0 0-1.313-4.041l-8.47-.413-3.01-7.927a2.273 2.273 0 0 0-4.249 0l-3.01 7.928-8.469.413a2.272 2.272 0 0 0-1.314 4.041ZM82.3 25.24a2.272 2.272 0 0 0 2.014-1.463l2.357-6.209 2.357 6.209a2.272 2.272 0 0 0 2.014 1.463l6.634.324-5.177 4.161a2.272 2.272 0 0 0-.77 2.368l1.744 6.407-5.557-3.637a2.273 2.273 0 0 0-2.489 0L79.87 38.5l1.742-6.409a2.273 2.273 0 0 0-.769-2.368l-5.177-4.159ZM.851 26.526l6.609 5.312-2.224 8.184a2.273 2.273 0 0 0 3.438 2.5l7.095-4.644 7.1 4.645a2.273 2.273 0 0 0 3.437-2.5l-2.23-8.184 6.609-5.312a2.272 2.272 0 0 0-1.313-4.042l-8.47-.413-3.01-7.927a2.273 2.273 0 0 0-4.249 0l-3.01 7.928-8.469.413a2.273 2.273 0 0 0-1.313 4.04Zm10.546-1.286a2.272 2.272 0 0 0 2.009-1.463l2.357-6.209 2.357 6.209a2.272 2.272 0 0 0 2.014 1.463l6.634.324-5.177 4.161a2.272 2.272 0 0 0-.77 2.368L22.57 38.5l-5.557-3.638a2.273 2.273 0 0 0-2.489 0L8.966 38.5l1.74-6.408a2.273 2.273 0 0 0-.769-2.368l-5.174-4.16Zm90.79 59.778a18.369 18.369 0 0 0-6.5-9.2 18.153 18.153 0 0 0-4.747-2.558 10 10 0 1 0-12.333-.006 18.025 18.025 0 0 0-8.001 5.717 23.842 23.842 0 0 0-12.312-8.909 12.83 12.83 0 1 0-14.139 0 23.84 23.84 0 0 0-12.317 8.908 18.024 18.024 0 0 0-8.009-5.713 10 10 0 1 0-12.334.006 18.158 18.158 0 0 0-4.747 2.558 18.369 18.369 0 0 0-6.5 9.2 5.279 5.279 0 0 0 .812 4.8 5.279 5.279 0 0 0 4.346 2.2h22.131V94.9a7.545 7.545 0 0 0 7.536 7.536h32.294a7.545 7.545 0 0 0 7.539-7.536v-2.886H97.03a5.4 5.4 0 0 0 5.157-7Zm-17.4-26.425a6.8 6.8 0 1 1-6.8 6.8 6.809 6.809 0 0 1 6.795-6.799Zm-43.191.768a9.629 9.629 0 1 1 9.635 9.629h-.011a9.64 9.64 0 0 1-9.624-9.629Zm-23.933-.769a6.8 6.8 0 1 1-6.8 6.8 6.809 6.809 0 0 1 6.795-6.799Zm10.082 30.22H5.406a2.1 2.1 0 0 1-1.769-.894 2.1 2.1 0 0 1-.331-1.954 15.021 15.021 0 0 1 26.729-4.049 23.686 23.686 0 0 0-2.29 6.897ZM71.706 94.9a4.34 4.34 0 0 1-4.335 4.335H35.073a4.34 4.34 0 0 1-4.335-4.335v-4.4a20.558 20.558 0 0 1 20.477-18.308h.011A20.558 20.558 0 0 1 71.706 90.5Zm27.1-6.982a2.1 2.1 0 0 1-1.769.893H74.696a23.7 23.7 0 0 0-2.3-6.9 15.021 15.021 0 0 1 26.729 4.05 2.1 2.1 0 0 1-.326 1.959Z" />
    </svg>
  ),
  Bin: (props: IconProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.width || props.size || "24px"}
      height={props.height || props.size || "24px"}
      viewBox="0 0 14.431 16.768"
      {...props}
    >
      <g data-name="delete (1)">
        <path
          d="M9.671 6.434a.416.416 0 0 0-.416.416v7.864a.416.416 0 0 0 .832 0V6.85a.416.416 0 0 0-.416-.416Zm0 0"
          data-name="Path 158"
        />
        <path
          d="M4.761 6.434a.416.416 0 0 0-.416.416v7.864a.416.416 0 1 0 .832 0V6.85a.416.416 0 0 0-.416-.416Zm0 0"
          data-name="Path 159"
        />
        <path
          d="M1.182 5.289v10.252a2.3 2.3 0 0 0 .61 1.583 2.049 2.049 0 0 0 1.487.643h7.873a2.049 2.049 0 0 0 1.487-.643 2.3 2.3 0 0 0 .61-1.583V5.289a1.59 1.59 0 0 0-.408-3.126h-2.13v-.52A1.634 1.634 0 0 0 9.063.001H5.368A1.634 1.634 0 0 0 3.72 1.643v.52H1.589a1.59 1.59 0 0 0-.408 3.126Zm9.97 11.646H3.279a1.318 1.318 0 0 1-1.265-1.394V5.326h10.4v10.215a1.318 1.318 0 0 1-1.263 1.394Zm-6.6-15.292a.8.8 0 0 1 .816-.811h3.695a.8.8 0 0 1 .816.811v.52H4.552ZM1.589 2.996h11.252a.75.75 0 0 1 0 1.5H1.589a.75.75 0 1 1 0-1.5Zm0 0"
          data-name="Path 160"
        />
        <path
          d="M7.216 6.434a.416.416 0 0 0-.416.416v7.864a.416.416 0 1 0 .832 0V6.85a.416.416 0 0 0-.416-.416Zm0 0"
          data-name="Path 161"
        />
      </g>
    </svg>
  ),
  ChevronRight: (props: IconProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.width || props.size || "24px"}
      height={props.height || props.size || "24px"}
      viewBox="0 0 256 512"
      {...props}
    >
      <path d="m17.525 36.465-7.071 7.07c-4.686 4.686-4.686 12.284 0 16.971L205.947 256 10.454 451.494c-4.686 4.686-4.686 12.284 0 16.971l7.071 7.07c4.686 4.686 12.284 4.686 16.97 0l211.051-211.05c4.686-4.686 4.686-12.284 0-16.971L34.495 36.465c-4.686-4.687-12.284-4.687-16.97 0z" />
    </svg>
  ),
  Menu: (props: IconProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.width || props.size || "24px"}
      height={props.height || props.size || "24px"}
      viewBox="0 0 24 24"
      {...props}
    >
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  ),
  Boxes: (props: IconProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.width || props.size || "24px"}
      height={props.height || props.size || "24px"}
      viewBox="2 2 26 31"
      {...props}
    >
      <path d="M8.5 2a.5.5 0 00-.5.5V15H2.5a.5.5 0 00-.5.5v13a.5.5 0 00.5.5h26a.5.5 0 00.5-.5v-13a.5.5 0 00-.5-.5h-5.51V2.5a.5.5 0 00-.5-.5H8.5zM9 3h3.496v4.5a.5.5 0 00.81.39l.94-.75.938.75a.5.5 0 00.623 0l.94-.75.937.75a.5.5 0 00.812-.39V3h3.494v12H9V3zm4.496 0h4v3.463l-.44-.352a.5.5 0 00-.622 0l-.938.75-.94-.75a.5.5 0 00-.622 0l-.438.35V3zM3 16h3v4.5a.5.5 0 00.813.39l.937-.75.938.75a.5.5 0 00.624 0l.938-.75.938.75A.5.5 0 0012 20.5V16h3v12H3V16zm4 0h4v3.46l-.438-.349a.5.5 0 00-.624 0l-.938.75-.938-.75a.5.5 0 00-.624 0l-.438.35V16zm9 0h3v4.5a.5.5 0 00.813.39l.937-.75.938.75a.5.5 0 00.625 0l.937-.75.938.75A.5.5 0 0025 20.5V16h3v12H16V16zm4 0h4v3.46l-.438-.349a.5.5 0 00-.625 0l-.937.75-.938-.75a.5.5 0 00-.625 0l-.437.35V16z" />
    </svg>
  ),
  Product: (props: IconProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.width || props.size || "24px"}
      height={props.height || props.size || "24px"}
      viewBox="0 0 49.516 50.001"
      {...props}
    >
      <g id="product" transform="translate(-9.002 -6.5)">
        <line
          id="Line_17"
          data-name="Line 17"
          x2="6.322"
          y2="1.445"
          transform="translate(44.798 28.288)"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit="10"
          strokeWidth="2"
        />
        <line
          id="Line_18"
          data-name="Line 18"
          y1="1.442"
          x2="6.31"
          transform="translate(16.4 28.291)"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit="10"
          strokeWidth="2"
        />
        <path
          id="Path_196"
          data-name="Path 196"
          d="M181.667,87.645l1.781-.259a1.236,1.236,0,0,0,.931-.676l3.35-6.787a1.236,1.236,0,0,1,2.217,0l3.35,6.788a1.236,1.236,0,0,0,.931.676l7.491,1.088a1.236,1.236,0,0,1,.685,2.108l-5.42,5.283a1.236,1.236,0,0,0-.372.842"
          transform="translate(-155.077 -64.802)"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit="10"
          strokeWidth="2"
        />
        <path
          id="Path_197"
          data-name="Path 197"
          d="M117.785,179.834a1.236,1.236,0,0,0-.373-.851l-5.42-5.283a1.236,1.236,0,0,1,.685-2.108l2.412-.35"
          transform="translate(-91.796 -147.919)"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit="10"
          strokeWidth="2"
        />
        <path
          id="Path_198"
          data-name="Path 198"
          d="M81.269,333.9l-4.281-.979a.992.992,0,0,1-.771-.967V318.766"
          transform="translate(-59.817 -281.188)"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit="10"
          strokeWidth="2"
        />
        <path
          id="Path_199"
          data-name="Path 199"
          d="M188.932,319.085v13.158a.992.992,0,0,1-.771.967l-16.374,3.743a.967.967,0,0,1-.431,0l-8.8-2.012"
          transform="translate(-137.812 -281.477)"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit="10"
          strokeWidth="2"
        />
        <line
          id="Line_19"
          data-name="Line 19"
          y2="8.074"
          transform="translate(33.76 47.306)"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit="10"
          strokeWidth="2"
        />
        <line
          id="Line_20"
          data-name="Line 20"
          y2="10.223"
          transform="translate(33.76 33.701)"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit="10"
          strokeWidth="2"
        />
        <path
          id="Path_200"
          data-name="Path 200"
          d="M47.013,246.348l10.505-2.364-6.4-6.4-17.36,3.968L16.4,237.585l-6.4,6.4L27.411,247.9l6.349-6.349"
          transform="translate(0 -207.852)"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit="10"
          strokeWidth="2"
        />
        <path
          id="Path_201"
          data-name="Path 201"
          d="M255.871,278.649,262.22,285l3.622-.815"
          transform="translate(-222.111 -244.948)"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit="10"
          strokeWidth="2"
        />
        <line
          id="Line_21"
          data-name="Line 21"
          y2="2.976"
          transform="translate(33.76 7.5)"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit="10"
          strokeWidth="2"
        />
        <line
          id="Line_22"
          data-name="Line 22"
          y2="2.976"
          transform="translate(33.76 7.5)"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit="10"
          strokeWidth="2"
        />
        <line
          id="Line_23"
          data-name="Line 23"
          x1="1.913"
          y2="2.28"
          transform="translate(39.872 13.8)"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit="10"
          strokeWidth="2"
        />
        <line
          id="Line_24"
          data-name="Line 24"
          x1="1.913"
          y2="2.28"
          transform="translate(39.872 13.8)"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit="10"
          strokeWidth="2"
        />
        <line
          id="Line_25"
          data-name="Line 25"
          x1="2.28"
          y2="1.913"
          transform="translate(48.299 17.083)"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit="10"
          strokeWidth="2"
        />
        <line
          id="Line_26"
          data-name="Line 26"
          x1="2.28"
          y2="1.913"
          transform="translate(48.299 17.083)"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit="10"
          strokeWidth="2"
        />
        <line
          id="Line_27"
          data-name="Line 27"
          x2="1.913"
          y2="2.28"
          transform="translate(25.736 13.8)"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit="10"
          strokeWidth="2"
        />
        <line
          id="Line_28"
          data-name="Line 28"
          x2="1.913"
          y2="2.28"
          transform="translate(25.736 13.8)"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit="10"
          strokeWidth="2"
        />
        <line
          id="Line_29"
          data-name="Line 29"
          x2="2.28"
          y2="1.913"
          transform="translate(16.942 17.083)"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit="10"
          strokeWidth="2"
        />
        <line
          id="Line_30"
          data-name="Line 30"
          x2="2.28"
          y2="1.913"
          transform="translate(16.942 17.083)"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeMiterlimit="10"
          strokeWidth="2"
        />
      </g>
    </svg>
  ),
  RectangleGroup: (props: IconProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      // strokeWidth={1.5}
      width={props.width || props.size || "24px"}
      height={props.height || props.size || "24px"}
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125v-3.75ZM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-8.25ZM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-2.25Z"
      />
    </svg>
  ),
};
