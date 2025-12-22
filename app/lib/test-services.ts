import { emailService } from '../lib/email';
import { discordService } from '../lib/discord';

export default async function testServices() {
  console.log('🧪 Testing Email and Discord Services...\n');

  // Test Email Service
  console.log('📧 Testing Email Service:');
  if (emailService.isConfigured()) {
    console.log('✅ Email service is configured');
    const emailResult = await emailService.sendEmail(
      'test@example.com',
      'JellyConnect Test',
      '<h1>Test Email</h1><p>This is a test email from JellyConnect.</p>',
      'Test Email\n\nThis is a test email from JellyConnect.'
    );
    console.log(emailResult ? '✅ Email sent successfully' : '❌ Email failed to send');
  } else {
    console.log('❌ Email service not configured');
  }

  console.log('');

  // Test Discord Service
  console.log('💬 Testing Discord Service:');
  if (discordService.isConfigured()) {
    console.log('✅ Discord service is configured');
    const discordResult = await discordService.sendDirectMessageByUsername(
      'test-user',
      '**JellyConnect Test**\n\nThis is a test message from JellyConnect.'
    );
    console.log(discordResult ? '✅ Discord message sent successfully' : '❌ Discord message failed to send');
  } else {
    console.log('❌ Discord service not configured');
  }

  console.log('\n🏁 Service testing complete!');
}