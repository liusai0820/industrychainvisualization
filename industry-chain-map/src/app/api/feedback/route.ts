import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Resend } from 'resend';
import { Octokit } from 'octokit';

const resend = new Resend(process.env.RESEND_API_KEY);
const octokit = new Octokit({ auth: process.env.GITHUB_ACCESS_TOKEN });

async function sendEmailNotification(feedback: string, email: string) {
  try {
    await resend.emails.send({
      from: 'Feedback <onboarding@resend.dev>',
      to: process.env.NOTIFICATION_EMAIL!,
      subject: '产业链图谱系统 - 新用户反馈',
      html: `
        <h2>新反馈通知</h2>
        <p><strong>反馈内容：</strong></p>
        <p>${feedback}</p>
        ${email ? `<p><strong>用户邮箱：</strong> ${email}</p>` : ''}
        <hr>
        <p>来自产业链图谱生成系统</p>
      `
    });
  } catch (error) {
    console.error('发送邮件通知失败:', error);
  }
}

async function createGitHubIssue(feedback: string, email: string) {
  try {
    await octokit.rest.issues.create({
      owner: process.env.GITHUB_REPO_OWNER!,
      repo: process.env.GITHUB_REPO_NAME!,
      title: '用户反馈: ' + feedback.substring(0, 50) + (feedback.length > 50 ? '...' : ''),
      body: `
### 反馈内容

${feedback}

${email ? `### 联系方式\n${email}` : ''}

---
*此 Issue 由反馈系统自动创建*
      `.trim(),
      labels: ['feedback']
    });
  } catch (error) {
    console.error('创建 GitHub Issue 失败:', error);
  }
}

async function saveFeedback(feedback: string, email: string) {
  // 并行处理邮件通知和创建 Issue
  await Promise.all([
    sendEmailNotification(feedback, email),
    createGitHubIssue(feedback, email)
  ]);
  
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const { feedback, email } = await request.json();

    if (!feedback) {
      return NextResponse.json(
        { error: '反馈内容不能为空' },
        { status: 400 }
      );
    }

    await saveFeedback(feedback, email);

    return NextResponse.json(
      { message: '反馈提交成功' },
      { status: 200 }
    );
  } catch (error) {
    console.error('处理反馈时出错:', error);
    return NextResponse.json(
      { error: '提交反馈时出现错误' },
      { status: 500 }
    );
  }
} 