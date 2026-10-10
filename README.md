# MailGuard - Git Workflow (Mô hình 4 Branch)

Dự án sử dụng mô hình nhiều branch trong cùng một repository:

- `main`: code ổn định, dùng cho production, không commit trực tiếp
- `client`: phát triển frontend
- `server`: phát triển backend API
- `pipeline`: xử lý AI / dữ liệu

## Chọn đúng branch

- UI / frontend: `client`
- API / backend: `server`
- AI / pipeline: `pipeline`

## Quy trình làm việc

Trước khi code:

```bash
git checkout <branch>
git pull origin <branch>
```

Sau đó:

1. Code đúng phạm vi của branch
2. Commit ngắn gọn, rõ ràng
3. Push thường xuyên

```bash
git add .
git commit -m "feat: mô tả ngắn"
git push origin <branch>
```

## Quy ước commit

- `feat:` thêm tính năng
- `fix:` sửa lỗi
- `refactor:` cải tiến code
- `docs:` cập nhật tài liệu
- `chore:` config / setup

## Merge vào `main`

Chỉ merge khi:

- Hoàn thành feature
- Đã test
- Không còn lỗi nghiêm trọng

```bash
git checkout main
git pull origin main
git merge <branch>
git push origin main
```

Ví dụ:

```bash
git merge client
```

## Quy tắc quan trọng

Không được:

- Commit trực tiếp vào `main`
- Làm nhiều loại công việc trong cùng một branch
- Code sai branch, ví dụ backend trong `client`

Luôn phải:

- Pull trước khi code
- Commit ngắn gọn, dễ hiểu
- Push thường xuyên
- Test trước khi merge

## Đồng bộ branch sau khi `main` cập nhật

Ví dụ với `client`:

```bash
git checkout client
git pull origin client
git merge main
git push origin client
```

Làm tương tự cho:

- `server`
- `pipeline`

## Branch tạm cho feature lớn

Nếu task lớn hoặc có rủi ro cao:

```bash
git checkout -b temp/feature-name
```

Khi xong:

```bash
git checkout client
git merge temp/feature-name
git branch -d temp/feature-name
```

## Tóm tắt

`Work -> Commit -> Push -> Test -> Merge -> Sync`

## Ví dụ đầy đủ

```bash
git checkout client
git pull origin client

# code...

git add .
git commit -m "feat: login UI"
git push origin client

git checkout main
git pull origin main
git merge client
git push origin main
```
