Lưu ý: Dự án chỉ phục vụ mục đích học tập

# Hướng Dẫn Tạo Bot Discord và Lấy API Key của Gemini

## Mục lục
1. [Giới thiệu](#giới-thiệu)
2. [Cài đặt](#cài-đặt)
3. [Tạo Bot trên Discord](#tạo-bot-trên-discord)
4. [Lấy API Key của Gemini từ AI Studio](#lấy-api-key-của-gemini-từ-ai-studio)
5. [Cấu hình Bot](#cấu-hình-bot)
6. [Chạy Bot](#chạy-bot)
7. [Ghi chú](#ghi-chú)

## Giới thiệu
Bot này được thiết kế để tương tác với người dùng trên Discord, sử dụng API của Google Generative AI để tạo ra các phản hồi thông minh và tự nhiên. Chúng tôi khuyến khích bạn chạy server trên Konya để có trải nghiệm tốt nhất.

## Cài đặt
1. Clone repository này về máy của bạn:
    ```sh
    git clone <repository-url>
    cd <repository-directory>
    ```

2. Cài đặt các dependencies:
    ```sh
    npm install
    ```

## Tạo Bot trên Discord
1. Truy cập [Discord Developer Portal](https://discord.com/developers/applications).
2. Nhấn vào nút "New Application" và đặt tên cho ứng dụng của bạn.
3. Trong trang ứng dụng, chọn tab "Bot" và nhấn "Add Bot".
4. Sao chép token của bot và dán vào file `config.json`:
    ```json
    {
        "token": "YOUR_DISCORD_BOT_TOKEN",
        ...
    }
    ```
5. Để bot có thể đọc tin nhắn chat, hãy đảm bảo rằng bạn đã cấp quyền "Read Messages" và "Read Message History" trong Discord Developer Portal.

## Lấy API Key của Gemini từ AI Studio
1. Truy cập [AI Studio của Google](https://aistudio.google.com).
2. Đăng nhập bằng tài khoản Google của bạn.
3. Tạo một dự án mới hoặc chọn một dự án hiện có.
4. Truy cập phần "API & Services" và tạo một API key.
5. Sao chép API key và dán vào file `config.json`:
    ```json
    {
        ...
        "gmn-key": "YOUR_GEMINI_API_KEY",
        "gmn-model": "gemini-1.5-pro-exp-0827",
        ...
    }
    ```

## Cấu hình Bot
1. Mở file `config.json` và cấu hình các thông số cần thiết:
    ```json
    {
        "token": "YOUR_DISCORD_BOT_TOKEN",
        "gmn-key": "YOUR_GEMINI_API_KEY",
        "gmn-model": "gemini-1.5-pro-exp-0827",
        "error-log-guild": "YOUR_ERROR_LOG_GUILD_ID",
        "error-log-channel": "YOUR_ERROR_LOG_CHANNEL_ID",
        "recent_chat_max": 20
    }
    ```

## Chạy Bot
1. Chạy bot bằng lệnh:
    ```sh
    npm start
    ```

Bot của bạn bây giờ sẽ hoạt động trên Discord và sử dụng API của Google Generative AI để tạo ra các phản hồi thông minh.

## Ghi chú
- Đảm bảo rằng tất cả các dependencies đã được cài đặt và cấu hình đúng.
- Nếu gặp bất kỳ lỗi nào, kiểm tra lại các bước cấu hình và đảm bảo rằng các thông tin như token và API key đã được nhập đúng.
- Để có trải nghiệm tốt nhất, hãy chạy server trên Konya.
- Tại file `prompt.txt`, yêu cầu người dùng tự mô tả ứng dụng của họ.

