/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // 💡 초대형 화면에서도 계속 확장되도록 커스텀 브레이크포인트 추가
      screens: {
        "3xl": "1920px",
        "4xl": "2560px",
      },
    },
  },
  plugins: [
    // line-clamp 클래스를 쓰는 경우 활성화 (미사용이면 제거 가능)
    require("@tailwindcss/line-clamp"),
  ],
};
