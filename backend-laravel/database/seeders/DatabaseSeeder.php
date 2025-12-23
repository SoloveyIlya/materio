<?php

namespace Database\Seeders;

use App\Models\ActivityLog;
use App\Models\AdminProfile;
use App\Models\DocumentationCategory;
use App\Models\DocumentationPage;
use App\Models\Domain;
use App\Models\Message;
use App\Models\ModeratorEarning;
use App\Models\ModeratorProfile;
use App\Models\RequiredDocument;
use App\Models\Role;
use App\Models\Task;
use App\Models\TaskAssignment;
use App\Models\TaskCategory;
use App\Models\TaskResult;
use App\Models\TaskTemplate;
use App\Models\Test;
use App\Models\TestAnswer;
use App\Models\TestLevel;
use App\Models\TestQuestion;
use App\Models\TestResult;
use App\Models\Ticket;
use App\Models\Tool;
use App\Models\TrainingQuestion;
use App\Models\User;
use App\Models\UserDocument;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Создаем роли
        $adminRole = Role::firstOrCreate(['name' => 'admin'], [
            'display_name' => 'Administrator',
            'description' => 'Full system access',
        ]);

        $moderatorRole = Role::firstOrCreate(['name' => 'moderator'], [
            'display_name' => 'Moderator',
            'description' => 'Moderator access',
        ]);

        // 2. Создаем домен по умолчанию
        $domain = Domain::firstOrCreate(['domain' => 'default'], [
            'name' => 'Default Domain',
            'settings' => [
                'branding' => [
                    'logo' => null,
                    'primary_color' => '#000000',
                ],
            ],
            'is_active' => true,
        ]);

        // 3. Создаем пользователей
        // Создаем главного админа с нужным email
        $admin = User::firstOrCreate(['email' => 'infso@smart-eu-solution.com'], [
            'domain_id' => $domain->id,
            'name' => 'Admin User',
            'password' => Hash::make('12345678'),
            'registration_password' => '12345678',
            'timezone' => 'UTC',
            'work_start_date' => now()->subMonths(6),
            'ip_address' => '192.168.1.100',
            'platform' => 'macOS',
            'last_seen_at' => now(),
            'is_online' => true,
        ]);
        $admin->roles()->syncWithoutDetaching([$adminRole->id]);
        
        AdminProfile::firstOrCreate(['user_id' => $admin->id], [
            'settings' => null,
        ]);

        // Также создаем тестового админа
        $testAdmin = User::firstOrCreate(['email' => 'admin@example.com'], [
            'domain_id' => $domain->id,
            'name' => 'Test Admin',
            'password' => Hash::make('password'),
            'registration_password' => 'password',
            'timezone' => 'UTC',
            'work_start_date' => now()->subMonths(6),
            'ip_address' => '192.168.1.100',
            'platform' => 'macOS',
            'last_seen_at' => now(),
            'is_online' => true,
        ]);
        $testAdmin->roles()->syncWithoutDetaching([$adminRole->id]);
        
        AdminProfile::firstOrCreate(['user_id' => $testAdmin->id], [
            'settings' => null,
        ]);

        $moderator1 = User::firstOrCreate(['email' => 'moderator1@example.com'], [
            'domain_id' => $domain->id,
            'name' => 'John Moderator',
            'password' => Hash::make('password'),
            'registration_password' => 'password',
            'timezone' => 'America/New_York',
            'work_start_date' => now()->subMonths(3),
            'administrator_id' => $admin->id,
            'ip_address' => '192.168.1.101',
            'platform' => 'Windows',
            'last_seen_at' => now()->subMinutes(5),
            'is_online' => true,
        ]);
        $moderator1->roles()->syncWithoutDetaching([$moderatorRole->id]);
        
        ModeratorProfile::firstOrCreate(['user_id' => $moderator1->id], [
            'settings' => null,
            'minimum_minutes_between_tasks' => 5,
        ]);

        $moderator2 = User::firstOrCreate(['email' => 'moderator2@example.com'], [
            'domain_id' => $domain->id,
            'name' => 'Jane Moderator',
            'password' => Hash::make('password'),
            'registration_password' => 'password',
            'timezone' => 'Europe/London',
            'work_start_date' => now()->subMonths(2),
            'administrator_id' => $testAdmin->id,
            'ip_address' => '192.168.1.102',
            'platform' => 'Linux',
            'last_seen_at' => now()->subHours(2),
            'is_online' => false,
        ]);
        $moderator2->roles()->syncWithoutDetaching([$moderatorRole->id]);
        
        ModeratorProfile::firstOrCreate(['user_id' => $moderator2->id], [
            'settings' => null,
            'minimum_minutes_between_tasks' => 10,
        ]);

        // 4. Создаем категории задач
        $testCategory = TaskCategory::firstOrCreate([
                'domain_id' => $domain->id,
                'slug' => 'test',
            ], [
                'name' => 'Test',
                'description' => 'Testing tasks',
            ]);

        $documentCheckCategory = TaskCategory::firstOrCreate([
                'domain_id' => $domain->id,
                'slug' => 'document-check',
            ], [
                'name' => 'Document check',
                'description' => 'Document verification tasks',
            ]);

        $comprehensiveCategory = TaskCategory::firstOrCreate([
                'domain_id' => $domain->id,
                'slug' => 'comprehensive-verification',
            ], [
                'name' => 'Comprehensive verification',
                'description' => 'Full verification tasks',
        ]);

        // 5. Создаем шаблоны задач
        $template1 = TaskTemplate::firstOrCreate([
            'domain_id' => $domain->id,
            'category_id' => $testCategory->id,
            'title' => 'Basic Test Template',
        ], [
            'description' => 'Basic testing template',
            'price' => 10.00,
            'completion_hours' => 1,
            'work_day' => 1,
            'is_primary' => true,
            'is_active' => true,
        ]);

        $template2 = TaskTemplate::firstOrCreate([
            'domain_id' => $domain->id,
            'category_id' => $documentCheckCategory->id,
            'title' => 'Document Verification Template',
        ], [
            'description' => 'Template for document verification',
            'price' => 25.00,
            'completion_hours' => 2,
            'work_day' => 1,
            'is_primary' => true,
            'is_active' => true,
        ]);

        // 6. Создаем задачи
        $task1 = Task::firstOrCreate([
            'domain_id' => $domain->id,
            'category_id' => $testCategory->id,
            'title' => 'Test Task 1',
        ], [
            'template_id' => $template1->id,
            'assigned_to' => $moderator1->id,
            'description' => 'First test task',
            'price' => 10.00,
            'completion_hours' => 1,
            'status' => 'in_progress',
            'work_day' => 1,
            'assigned_at' => now()->subDays(1),
            'due_at' => now()->addDays(1),
        ]);

        $task2 = Task::firstOrCreate([
            'domain_id' => $domain->id,
            'category_id' => $documentCheckCategory->id,
            'title' => 'Document Check Task',
        ], [
            'template_id' => $template2->id,
            'assigned_to' => $moderator2->id,
            'description' => 'Document verification task',
            'price' => 25.00,
            'completion_hours' => 2,
            'status' => 'pending',
            'work_day' => 2,
            'first_name' => 'John',
            'last_name' => 'Doe',
            'country' => 'USA',
            'email' => 'john.doe@example.com',
            'assigned_at' => now()->subHours(5),
            'due_at' => now()->addDays(2),
        ]);

        // 7. Создаем назначения задач
        TaskAssignment::firstOrCreate([
            'task_id' => $task1->id,
            'assigned_to' => $moderator1->id,
        ], [
            'assigned_by' => $testAdmin->id,
            'assigned_at' => now()->subDays(1),
            'started_at' => now()->subHours(5),
        ]);

        // 8. Создаем результаты задач
        TaskResult::firstOrCreate(['task_id' => $task1->id], [
            'moderator_id' => $moderator1->id,
            'moderator_comment' => 'Task completed successfully',
            'admin_comment' => null,
        ]);

        // 9. Создаем категории документации
        $docCategory1 = DocumentationCategory::firstOrCreate([
            'domain_id' => $domain->id,
            'slug' => 'guides',
        ], [
            'name' => 'Guides',
            'description' => 'User guides and documentation',
        ]);

        $docCategory2 = DocumentationCategory::firstOrCreate([
            'domain_id' => $domain->id,
            'slug' => 'faq',
        ], [
            'name' => 'FAQ',
            'description' => 'Frequently asked questions',
        ]);

        // 10. Создаем страницы документации
        DocumentationPage::firstOrCreate([
            'domain_id' => $domain->id,
            'category_id' => $docCategory1->id,
            'slug' => 'getting-started',
        ], [
            'title' => 'Getting Started',
            'content' => 'Welcome to the platform. This guide will help you get started.',
            'order' => 1,
            'is_published' => true,
        ]);

        DocumentationPage::firstOrCreate([
            'domain_id' => $domain->id,
            'category_id' => $docCategory1->id,
            'slug' => 'advanced-features',
        ], [
            'title' => 'Advanced Features',
            'content' => 'Learn about advanced features and capabilities.',
            'order' => 2,
            'is_published' => true,
        ]);

        // 11. Создаем инструменты
        $tool1 = Tool::firstOrCreate([
            'domain_id' => $domain->id,
            'slug' => 'verification-tool',
        ], [
            'name' => 'Verification Tool',
            'description' => 'Tool for verification tasks',
            'url' => 'https://example.com/verification',
            'is_active' => true,
        ]);

        // 12. Создаем уровни тестов
        $testLevel1 = TestLevel::firstOrCreate([
            'domain_id' => $domain->id,
            'name' => 'Beginner',
        ], [
            'order' => 1,
        ]);

        $testLevel2 = TestLevel::firstOrCreate([
            'domain_id' => $domain->id,
            'name' => 'Intermediate',
        ], [
            'order' => 2,
        ]);

        // 13. Создаем тесты
        $test1 = Test::firstOrCreate([
            'domain_id' => $domain->id,
            'level_id' => $testLevel1->id,
            'title' => 'Basic Verification Test',
        ], [
            'description' => 'Test basic verification skills',
            'order' => 1,
            'is_active' => true,
        ]);

        // 14. Создаем вопросы тестов
        $question1 = TestQuestion::firstOrCreate([
            'test_id' => $test1->id,
            'question' => 'What is verification?',
        ], [
            'order' => 1,
        ]);

        // Создаем ответы для вопроса
        TestAnswer::firstOrCreate([
            'question_id' => $question1->id,
            'answer' => 'Checking documents',
        ], [
            'is_correct' => false,
            'order' => 1,
        ]);

        TestAnswer::firstOrCreate([
            'question_id' => $question1->id,
            'answer' => 'Approving tasks',
        ], [
            'is_correct' => false,
            'order' => 2,
        ]);

        TestAnswer::firstOrCreate([
            'question_id' => $question1->id,
            'answer' => 'Both A and B',
        ], [
            'is_correct' => true,
            'order' => 3,
        ]);

        // 15. Создаем результаты тестов
        TestResult::firstOrCreate([
            'user_id' => $moderator1->id,
            'test_id' => $test1->id,
        ], [
            'score' => 85,
            'total_questions' => 10,
            'percentage' => 85,
            'is_passed' => true,
            'completed_at' => now()->subDays(5),
        ]);

        // 16. Создаем вопросы для обучения
        TrainingQuestion::firstOrCreate([
            'domain_id' => $domain->id,
            'moderator_id' => $moderator1->id,
            'question' => 'How to verify a document?',
        ], [
            'answer' => 'Follow the verification checklist step by step.',
            'answered_by' => $admin->id,
            'answered_at' => now()->subDays(2),
            'is_resolved' => true,
        ]);

        // 17. Создаем обязательные документы
        RequiredDocument::firstOrCreate([
            'domain_id' => $domain->id,
            'name' => 'Identity Document',
        ], [
            'order' => 1,
            'is_active' => true,
        ]);

        RequiredDocument::firstOrCreate([
            'domain_id' => $domain->id,
            'name' => 'Proof of Address',
        ], [
            'order' => 2,
            'is_active' => true,
        ]);

        // 18. Создаем документы пользователей
        $requiredDoc1 = RequiredDocument::where('name', 'Identity Document')->first();
        if ($requiredDoc1) {
            UserDocument::firstOrCreate([
                'user_id' => $moderator1->id,
                'required_document_id' => $requiredDoc1->id,
            ], [
                'file_path' => '/storage/documents/identity_' . $moderator1->id . '.pdf',
                'file_name' => 'identity_document.pdf',
            ]);
        }

        // 19. Создаем тикеты
        Ticket::firstOrCreate([
            'domain_id' => $domain->id,
            'user_id' => $moderator1->id,
            'subject' => 'Need help with verification',
        ], [
            'assigned_to' => $testAdmin->id,
            'description' => 'I need help understanding the verification process.',
            'status' => 'open',
            'priority' => 'medium',
        ]);

        // 20. Создаем сообщения
        Message::firstOrCreate([
            'domain_id' => $domain->id,
            'from_user_id' => $moderator1->id,
            'to_user_id' => $testAdmin->id,
            'subject' => 'Question about verification',
            'body' => 'Hello, I need assistance with document verification.',
        ], [
            'is_read' => false,
        ]);

        // 21. Создаем заработки модераторов
        ModeratorEarning::firstOrCreate([
            'moderator_id' => $moderator1->id,
            'task_id' => $task1->id,
        ], [
            'amount' => 10.00,
            'earned_at' => now()->subHours(1),
            'notes' => 'Task completion payment',
        ]);

        // 22. Создаем логи активности
        ActivityLog::create([
            'domain_id' => $domain->id,
            'user_id' => $testAdmin->id,
            'action' => 'created',
            'event_type' => 'task',
            'model_type' => Task::class,
            'model_id' => $task1->id,
            'description' => 'Created task: ' . $task1->title,
            'ip_address' => '192.168.1.100',
            'user_agent' => 'Mozilla/5.0',
        ]);

        ActivityLog::create([
            'domain_id' => $domain->id,
            'user_id' => $moderator1->id,
            'action' => 'updated',
            'event_type' => 'task',
            'model_type' => Task::class,
            'model_id' => $task1->id,
            'description' => 'Updated task: ' . $task1->title,
            'ip_address' => '192.168.1.101',
            'user_agent' => 'Mozilla/5.0',
        ]);

        $this->command->info('Database seeded successfully!');
    }
}
