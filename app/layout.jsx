import "./globals.css";

export const metadata = {
  title: "Điều phối nhập hàng dự án",
  description: "Quản lý danh mục hàng nhập, tiến độ và trạng thái theo dự án."
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
