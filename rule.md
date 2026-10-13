Link Figma

Figma

https://www.figma.com/design/n4kdKa9VCq2o6zxyV9Dv1B/ArchSync-AI-%E2%80%93-Desktop-UI-Prototype?node-id=0-1&t=fkAju9HUbuPKsgHU-1



Draw.io

https://drive.google.com/file/d/1HPYkWgHfaZmAkQfAX63LjD-3_9u9mab6/view?fbclid=IwY2xjawUom_pleHRuA2FlbQIxMABwZG9mBWJyaWQRMUFsa2dwdkJ1M3RCY2JmeHlzcnRjBmFwcF9pZBAyMjIwMzkxNzg4MjAwODkyAAEe3D0RUb6mNBX1dTdDAYpXKl7D-yYFE7jCgtOhoTdJP4Mr4zokdirk8tS5LPc_aem_xlb_TDbbY0k3YMDrehjTcA




Chốt scope

https://docs.google.com/document/d/1lcl7EwEpGZ0qGMX0Oro3Mcjsbkj3QCqXwnd3NNh0k4Y/edit?usp=sharing

Rule FE

src/

├── assets/             # Hình ảnh, icon, font chữ tĩnh

├── components/         # Các Component dùng chung toàn dự án (UI re-usable)

│   ├── common/         # Button, Input, Modal, Loading, Card...

│   └── layout/         # Header, Footer, Sidebar, Navbar...

├── config/             # Cấu hình route, axios client, constants...

├── features/           # Chia theo từng tính năng/trang lớn

│   ├── auth/           # Tính năng Đăng nhập / Đăng ký

│   │   ├── components/ # Component chỉ dùng riêng cho Auth (LoginForm, RegisterForm...)

│   │   ├── services/   # Gọi API liên quan đến Auth

│   │   └── AuthPage.tsx

│   └── dashboard/      # Tính năng Dashboard/Trang chủ

│       ├── components/

│       └── DashboardPage.tsx

├── hooks/              # Custom Hooks dùng chung (useAuth, useFetch...).Quản lý các logic có liên quan (State) hoặc các tính năng vòng đời của React (useState, useEffect...)dùng nhiều                                    component khác nhau.

├── Styles/             #Quản lý cấu hình Tailwind & CSS toàn cục

     └── Globals.css    #Chứa @tailwind base, components, utilities & custom utility classes

├── services/           # Cấu hình API client (axios / fetch wrapper)

├── utils/              # Các hàm helper bổ trợ (format date, format tiền...)

├── constants/          # Biến hằng số toàn dự án (API_URL, REGEX...)

└── types/              # Định nghĩa kiểu dữ liệu TypeScript (User, Product...)



   



--------------------------------------------------------------------------------------------------------


--------------------------------------------------------------------------------------------------------



1. Quy tắc cho File và Folder Component (PascalCase)

Dành cho tất cả các UI Component (.tsx).

- Tên Folder & File Component: Viết hoa chữ cái đầu mỗi từ (PascalCase).

+ Đúng: Button.tsx, UserProfile.tsx, NavigationMenu.tsx

+ Sai: userProfile.tsx, user_profile.tsx, user-profile.tsx



2. Quy tắc cho Hooks, Utilities, Services (camelCase)

Dành cho các file xử lý logic, hàm helper hoặc gọi API (.ts).

- Custom Hooks: Phải bắt đầu bằng từ use + camelCase.

           + Ví dụ: useAuth.ts, useFetchUser.ts, useLocalStorage.ts

- Utils / Helpers: Viết bằng camelCase, mô tả đúng hành động của hàm.

           + Ví dụ: formatCurrency.ts, validateEmail.ts, formatDate.ts

- Services / API: Viết bằng camelCase hoặc kèm đuôi .service.ts/ .Api.ts

           + Ví dụ: authService.ts, userApi.ts


3. Quy tắc Absolute Import (@/)

Luôn sử dụng `@/` thay cho đường dẫn tương đối dài (../../):

  + Đúng: import { Button } from '@/components/common/Button';

  + Tránh: import { Button } from '../../../components/common/Button';


4. Quy tắc cho Feature Folders & Non-UI Folders (kebab-case / lowercase)

Dành cho thư mục tính năng trong features/ hoặc các thư mục không phải là UI Component.

- Tên folder tính năng: Viết thường toàn bộ, dùng dấu gạch ngang (kebab-case) hoặc lowercase.

  + Đúng: features/projects/, features/ai-generation/, features/shopping-cart/

  + Tránh: features/Projects/, features/AiGeneration/


GIẢI THÍCH:

 - File .tsx tạo ra giao diện nên Header.tsx, Footer.tsx.

- Folder tính năng (features/) & Folder hệ thống: Đây chỉ là thư mục  chứa file (không phải giao diện UI).Quy ước viết thường toàn bộ và dùng dấu gạch ngang (kebab-case) giúp:

        + Phân biệt ngay lập tức đâu là thư mục chứa mã nguồn (ai-generation/) và đâu là Component giao diện (Header/).

        + Tránh lỗi khi đưa code lên hệ thống Server (Linux) do Linux phân biệt chữ hoa/chữ thường còn Windows thì không.



5. Quy tắc Thứ tự Import (Import Order)

Luôn giữ thứ tự import trong file theo thứ tự từ ngoài vào trong:

  1. Thư viện ngoài (React, Lucide React, Axios...)

  2. Component / Module nội bộ (dùng Absolute Import `@/`)

  3. Custom Hooks / Services / Utils

  4. Types / Interfaces

  5. File Style (CSS Modules)


Ví dụ:

// 1. Thư viện bên ngoài (External Libraries)

import { useState } from 'react';

import axios from 'axios';

// 2. Component / Module nội bộ dự án (Dùng Absolute Import @/)

import { Button } from '@/components/common/Button';

// 3. Custom Hooks / Services / Utils (Xử lý logic)

import { useAuth } from '@/hooks/useAuth';

import { formatVND } from '@/utils/formatCurrency';

// 4. Types / Interfaces (Kiểu dữ liệu TypeScript)

import { Project } from '@/types/project';

// 5. File Style / CSS (Luôn để dưới cùng)

import styles from './ProjectCard.module.css';



Chat

Dùng Socket.IO




Kết nối + join room: mở màn hình chat thì FE mở 1 kết nối Socket duy nhất (giữ suốt phiên) và join vào room của cuộc hội thoại. Server kiểm tra quyền trước khi cho vào.
Tải lịch sử bằng REST: FE gọi 1 lần để lấy 30 tin mới nhất. Cuộn lên thì gọi tiếp, mỗi lần chỉ lấy thêm một đoạn. Đây là cách xem lại tin nhắn của nhiều ngày trước.
Gửi tin: FE hiển thị tin ngay (kèm client_id tạm), rồi emit message:send lên server.
Server lưu DB, rồi trả ack cho người gửi để FE đổi tin tạm thành tin thật (khớp bằng client_id).
Broadcast: server đẩy message:new cho tất cả người đang ở trong room (User B nhận ngay, không cần hỏi server). Người gửi cũng nhận, nhưng FE bỏ qua vì đã có sẵn.
Mất mạng rồi quay lại: socket tự reconnect, FE gọi REST GET ?after=<id tin cuối đang có> để bù phần bị lỡ. Nhờ bước này không bao giờ thiếu tin.
Chat chỉ dùng Socket khi có tin mới, và chỉ gọi REST khi mở chat, cuộn lên xem tin cũ, hoặc vừa reconnect, nên không cần gọi API định kỳ.



Gửi ảnh, file:

Người dùng thấy:

Bấm biểu tượng kẹp giấy (hoặc kéo thả/dán ảnh) vào ô chat.
Chọn file, thấy thanh tiến độ upload.
Bấm Send, khung file hiện trong đoạn chat như ảnh của bạn (Living room · v3.pdf, 2.4 MB).
Người kia nhận được ngay, bấm vào để xem hoặc tải.
Bên dưới diễn ra:

Khi chọn file, FE tự upload file lên S3/Cloudinary (chạy nền, có tiến độ).
Upload xong, FE gửi một tin qua Socket chứa link file.
Server lưu tin vào DB và broadcast cho người kia.

Video call, Record



Video call: LiveKit

Records: LiveKit Egress, lưu vào Firebase Storage




Video không đi qua BE của bạn. BE chỉ cấp token (bước 2) và gửi lệnh ghi cho LiveKit (bước 5). Hình và tiếng đi thẳng giữa FE và LiveKit (bước 3), nên BE nhẹ và không bị nghẽn.
Token do BE tạo, không phải FE tự tạo. BE kiểm tra người dùng có thuộc dự án không rồi mới cấp token. Đây là chỗ phân quyền ai được vào phòng họp.
LiveKit tự ghi và tự upload (bước 6). BE không phải xử lý file video.
Webhook (bước 7) là lúc bản ghi trở thành tin nhắn. BE nhận đường dẫn file, lưu DB, tạo tin type=file rồi broadcast qua Socket (bước 8 và 9). Phần này giống hệt luồng gửi file ở chat thường.
Xem lại bản ghi (bước 10): FE hỏi BE, BE kiểm tra quyền rồi cấp link xem có hạn, nên chỉ thành viên dự án mới xem được.

three.js (3d)

Bước 1: là upload ảnh 2d, User nhập các thông tin (kích thước, số phòng, cửa sổ, nền nhà, màu săcs...)        

Bước 2: Hiển thị lên editor 2D để người dùng chỉnh

Bước 3: bấm  "Tạo 3D" thì xuất JSON.

Bước 4: Nhờ vào file JSON đó, dùng Three.js để dựng 3D 





Lần đầu:   Tạo xong  →  FE gửi JSON lên BE  →  BE lưu vào DB (gắn với tài khoản)

Lần sau:   User đăng nhập  →  mở "Dự án của tôi"  →  FE tải JSON  →  Three.js dựng lại



Kiến trúc trên web:
React FE (Three.js chạy trong trình duyệt)

      │  JSON, ảnh

Node.js BE  ──  DB (users, projects)

      │

Thư mục/Storage: ảnh 2D gốc, ảnh chụp, file GLB đồ vật





A. Thư viện khuyên dùng cho React:
Konva.js (React-Konva): Rất dễ dùng cho việc kéo thả, vẽ các đoạn thẳng (tường), chèn icon (cửa sổ, bàn ghế) và bắt sự kiện click/drag.


Bộ thư viện hiển thị & tương tác 3D (Three.js cho React)
npm install three @react-three/fiber @react-three/drei

Thư viện làm Editor 2D (Bước đồ bản vẽ & xuất JSON)
        npm install konva react-konva

Thư viện Đồng bộ Comment Real-time
        npm install socket.io-client

Thư viện Animation & UI bổ trợ (hiệu ứng xoay camera mượt khi người dùng click vào 1 comment ở danh sách sidebar ➔ Camera tự động bay/xoay mượt đến vị trí góc 3D đó. )
        npm install @react-spring/three lucide-react
















COMMENT



Role

Trách nhiệm của Administrator (Quản trị viên)
Quản lý người dùng và quyền truy cập.
Phê duyệt các nhà thiết kế và nhà cung cấp tham gia nền tảng.
Quản lý dữ liệu danh mục dùng chung (Master Data), bao gồm phong cách thiết kế, loại hình công trình, danh mục nội thất, vật liệu và danh mục sản phẩm.
Cấu hình thư viện prompt cho AI và các thiết lập của hệ thống.
Quản lý các gói đăng ký và cấu hình nền tảng.
Giám sát các hoạt động trên nền tảng và tạo các báo cáo hệ thống.
Trách nhiệm của Customer (Chủ nhà / Khách hàng)
Quản lý thông tin hồ sơ cá nhân.
Tạo và quản lý các dự án thiết kế nội thất.
Cung cấp thông tin về bất động sản, ngân sách, yêu cầu công năng và sở thích thiết kế.
Tải lên bản vẽ mặt bằng, hình ảnh và video của không gian hiện trạng.
Khám phá các phương án thiết kế do AI tạo ra.
So sánh các phương án thiết kế khác nhau.
Trao đổi và làm việc với các nhà thiết kế nội thất.
Phê duyệt phương án thiết kế cuối cùng.
Theo dõi tiến độ dự án.
Đánh giá và xếp hạng dịch vụ thiết kế.
Trách nhiệm của Interior Designer / Architect (Nhà thiết kế nội thất / Kiến trúc sư)
Quản lý hồ sơ chuyên môn và portfolio.
Tiếp nhận và quản lý các dự án thiết kế.
Phân tích yêu cầu của khách hàng.
Tạo các thiết kế ý tưởng bằng công nghệ Generative AI.
Chỉnh sửa và hoàn thiện các phương án thiết kế.
Quản lý nhiều phiên bản thiết kế.
Lựa chọn đồ nội thất, vật liệu và các sản phẩm trang trí.
Lập BOM (Bill of Materials – Bảng kê vật tư) và dự toán chi phí dự án.
Phối hợp với khách hàng trong suốt quá trình thiết kế.
Trách nhiệm của Furniture and Material Supplier (Nhà cung cấp nội thất và vật liệu)
Quản lý danh mục sản phẩm.
Duy trì các thông số kỹ thuật của sản phẩm.
Cập nhật giá cả và tình trạng tồn kho.
Tải lên hình ảnh sản phẩm, mô hình 3D, texture và tài liệu liên quan.
Phản hồi các yêu cầu tìm hiểu thông tin sản phẩm từ nhà thiết kế.
Duy trì thông tin sản phẩm để tích hợp vào các dự án.
Ứng dụng AI (AI Application)
Ứng dụng các công nghệ Generative AI và Machine Learning (ML) nhằm hỗ trợ thiết kế nội thất ý tưởng, đưa ra các đề xuất thông minh, trực quan hóa thiết kế và tối ưu hóa chi phí dự án.

Các ứng dụng AI bao gồm:

Trích xuất các yêu cầu thiết kế từ văn bản và hình ảnh được tải lên.
Đề xuất phong cách thiết kế nội thất phù hợp.
Tạo hình ảnh phối cảnh / render thiết kế nội thất ý tưởng.
Tạo mood board và bố trí nội thất.
Đề xuất đồ nội thất và vật liệu xây dựng phù hợp.
Ước tính và tối ưu hóa ngân sách dự án.

Platform Admin: quản lý các công ty thuê , gói dịch vụ, cấu hình ai Chung

Staff: nhận viên điều phối của công ty. Nhận khách , lập hợp đồng, gán designer, theo dõi tiến độ

Designer: nhân viên thiết kế của công ty.

Homeowner: khách hàng của công ty

Supplier: nhà cung cấp, cung cấp sản phẩm 