This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.



docker build -t my-nextjs-app:latest .
docker save my-nextjs-app:latest -o my-nextjs-app.tar
Compress-Archive -Path my-nextjs-app.tar -DestinationPath my-nextjs-app.zip

di server
docker load -i my-nextjs-app.tar

===
perubahan db
ok-penambahan di fingerprint_scanner, kolom: last_pull_time, type: datetime with timezone
pending-penambahan table employee_shift_assignment
pending-add constraint di employee_shift_rule, unique_emp_id_shift_id_rotation_value
pending-tambahkan unique constract
  ALTER TABLE employee_shift_assignment
  ADD CONSTRAINT unique_employee_shift UNIQUE (employee_id, shift_id, shift_date);

pending-tambahkan
ALTER TABLE attendance_summary
ADD CONSTRAINT uq_attendance_summary_employee_date
UNIQUE (employee_id, summary_date);

