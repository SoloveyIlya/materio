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
        $this->command->info('🌱 Начинаем заполнение базы данных тестовыми данными...');

        // 1. Создаем роли
        $this->command->info('1️⃣ Создание ролей...');
        $adminRole = Role::firstOrCreate(['name' => 'admin'], [
            'display_name' => 'Administrator',
            'description' => 'Full system access',
        ]);

        $moderatorRole = Role::firstOrCreate(['name' => 'moderator'], [
            'display_name' => 'Moderator',
            'description' => 'Moderator access',
        ]);

        // 2. Создаем домены
        $this->command->info('2️⃣ Создание доменов...');
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

        $domain2 = Domain::firstOrCreate(['domain' => 'test'], [
            'name' => 'Test Domain',
            'settings' => [
                'branding' => [
                    'logo' => null,
                    'primary_color' => '#0066cc',
                ],
            ],
            'is_active' => true,
        ]);

        // 3. Создаем пользователей
        $this->command->info('3️⃣ Создание пользователей...');
        $users = [];
        
        // Главный админ
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
        AdminProfile::firstOrCreate(['user_id' => $admin->id]);
        $users['admin'] = $admin;

        // Дополнительные админы
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
        AdminProfile::firstOrCreate(['user_id' => $testAdmin->id]);
        $users['testAdmin'] = $testAdmin;

        // Модераторы
        $moderatorNames = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Eve', 'Frank'];
        $moderators = [];
        for ($i = 0; $i < 8; $i++) {
            $moderator = User::firstOrCreate(['email' => "moderator{$i}@example.com"], [
                'domain_id' => $domain->id,
                'name' => "{$moderatorNames[$i]} Moderator",
                'password' => Hash::make('password'),
                'registration_password' => 'password',
                'timezone' => ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'][$i % 4],
                'work_start_date' => now()->subMonths(rand(1, 6)),
                'administrator_id' => $i % 2 == 0 ? $admin->id : $testAdmin->id,
                'ip_address' => '192.168.1.' . (101 + $i),
                'platform' => ['Windows', 'macOS', 'Linux'][$i % 3],
                'last_seen_at' => now()->subMinutes(rand(0, 120)),
                'is_online' => $i < 3,
            ]);
            $moderator->roles()->syncWithoutDetaching([$moderatorRole->id]);
            ModeratorProfile::firstOrCreate(['user_id' => $moderator->id], [
                'minimum_minutes_between_tasks' => rand(5, 15),
                'has_w4' => $i % 2 == 0,
                'has_i9' => $i % 3 == 0,
                'has_direct' => $i % 4 == 0,
            ]);
            $moderators[] = $moderator;
        }
        $users['moderators'] = $moderators;

        // 4. Создаем категории задач
        $this->command->info('4️⃣ Создание категорий задач...');
        $categories = [];
        $categoryData = [
            ['name' => 'Test', 'slug' => 'test', 'description' => 'Testing tasks'],
            ['name' => 'Document check', 'slug' => 'document-check', 'description' => 'Document verification tasks'],
            ['name' => 'Comprehensive verification', 'slug' => 'comprehensive-verification', 'description' => 'Full verification tasks'],
            ['name' => 'Identity Verification', 'slug' => 'identity-verification', 'description' => 'Identity document verification'],
            ['name' => 'Address Verification', 'slug' => 'address-verification', 'description' => 'Address proof verification'],
            ['name' => 'Payment Verification', 'slug' => 'payment-verification', 'description' => 'Payment method verification'],
        ];

        foreach ($categoryData as $catData) {
            $category = TaskCategory::firstOrCreate([
                'domain_id' => $domain->id,
                'slug' => $catData['slug'],
            ], $catData);
            $categories[] = $category;
        }

        // 5. Создаем шаблоны задач
        $this->command->info('5️⃣ Создание шаблонов задач...');
        $templates = [];
        for ($i = 1; $i <= 15; $i++) {
            $template = TaskTemplate::firstOrCreate([
                'domain_id' => $domain->id,
                'category_id' => $categories[($i - 1) % count($categories)]->id,
                'title' => "Template {$i}: " . $categories[($i - 1) % count($categories)]->name,
            ], [
                'description' => "Template description for {$categories[($i - 1) % count($categories)]->name}",
                'price' => rand(10, 100) + (rand(0, 99) / 100),
                'completion_hours' => rand(1, 8),
                'work_day' => $i <= 10 ? $i : null,
                'is_primary' => $i <= 10,
                'is_active' => true,
                'guides_links' => [
                    'https://example.com/guide' . $i,
                    'https://example.com/tutorial' . $i,
                ],
                'attached_services' => [
                    'service_' . $i,
                ],
            ]);
            $templates[] = $template;
        }

        // 6. Создаем инструменты
        $this->command->info('6️⃣ Создание инструментов...');
        $tools = [];
        $toolData = [
            ['name' => 'Verification Tool', 'slug' => 'verification-tool', 'url' => 'https://example.com/verification'],
            ['name' => 'Document Scanner', 'slug' => 'document-scanner', 'url' => 'https://example.com/scanner'],
            ['name' => 'Identity Checker', 'slug' => 'identity-checker', 'url' => 'https://example.com/identity'],
            ['name' => 'Address Validator', 'slug' => 'address-validator', 'url' => 'https://example.com/address'],
            ['name' => 'Payment Processor', 'slug' => 'payment-processor', 'url' => 'https://example.com/payment'],
        ];

        foreach ($toolData as $toolInfo) {
            $tool = Tool::firstOrCreate([
                'domain_id' => $domain->id,
                'slug' => $toolInfo['slug'],
            ], [
                'name' => $toolInfo['name'],
                'description' => "Tool for {$toolInfo['name']}",
                'url' => $toolInfo['url'],
                'is_active' => true,
            ]);
            $tools[] = $tool;
        }

        // 7. Создаем категории документации
        $this->command->info('7️⃣ Создание категорий документации...');
        $docCategories = [];
        $docCategoryData = [
            ['name' => 'Guides', 'slug' => 'guides', 'description' => 'User guides and documentation'],
            ['name' => 'FAQ', 'slug' => 'faq', 'description' => 'Frequently asked questions'],
            ['name' => 'Tutorials', 'slug' => 'tutorials', 'description' => 'Step-by-step tutorials'],
            ['name' => 'API Documentation', 'slug' => 'api-docs', 'description' => 'API reference documentation'],
        ];

        foreach ($docCategoryData as $docCatData) {
            $docCategory = DocumentationCategory::firstOrCreate([
                'domain_id' => $domain->id,
                'slug' => $docCatData['slug'],
            ], $docCatData);
            $docCategories[] = $docCategory;
        }

        // 8. Создаем страницы документации
        $this->command->info('8️⃣ Создание страниц документации...');
        $docPages = [];
        $docPageData = [
            ['title' => 'Getting Started', 'slug' => 'getting-started', 'category' => 0],
            ['title' => 'Advanced Features', 'slug' => 'advanced-features', 'category' => 0],
            ['title' => 'Verification Process', 'slug' => 'verification-process', 'category' => 0],
            ['title' => 'Common Questions', 'slug' => 'common-questions', 'category' => 1],
            ['title' => 'Troubleshooting', 'slug' => 'troubleshooting', 'category' => 1],
            ['title' => 'Basic Tutorial', 'slug' => 'basic-tutorial', 'category' => 2],
            ['title' => 'Advanced Tutorial', 'slug' => 'advanced-tutorial', 'category' => 2],
        ];

        foreach ($docPageData as $index => $pageData) {
            $docPage = DocumentationPage::firstOrCreate([
                'domain_id' => $domain->id,
                'category_id' => $docCategories[$pageData['category']]->id,
                'slug' => $pageData['slug'],
            ], [
                'title' => $pageData['title'],
                'content' => "Content for {$pageData['title']}. This is a detailed guide covering all aspects.",
                'order' => $index + 1,
                'is_published' => true,
            ]);
            $docPages[] = $docPage;
        }

        // 9. Создаем задачи
        $this->command->info('9️⃣ Создание задач...');
        $tasks = [];
        $statuses = ['pending', 'in_progress', 'completed_by_moderator', 'under_admin_review', 'approved', 'rejected'];
        
        for ($i = 1; $i <= 30; $i++) {
            $template = $templates[($i - 1) % count($templates)];
            $moderator = $moderators[($i - 1) % count($moderators)];
            $status = $statuses[($i - 1) % count($statuses)];
            
            $task = Task::create([
                'domain_id' => $domain->id,
                'template_id' => $template->id,
                'assigned_to' => $status !== 'pending' ? $moderator->id : null,
                'title' => "Task {$i}: " . $template->title,
                'description' => "Description for task {$i}",
                'price' => $template->price,
                'completion_hours' => $template->completion_hours,
                'status' => $status,
                'work_day' => $i <= 10 ? $i : null,
                'is_main_task' => $i === 1,
                'assigned_at' => $status !== 'pending' ? now()->subDays(rand(1, 10)) : null,
                'due_at' => now()->addDays(rand(1, 7)),
                'completed_at' => in_array($status, ['completed_by_moderator', 'under_admin_review', 'approved']) ? now()->subDays(rand(1, 5)) : null,
                'first_name' => $i % 3 == 0 ? ['John', 'Jane', 'Bob', 'Alice'][($i - 1) % 4] : null,
                'last_name' => $i % 3 == 0 ? ['Doe', 'Smith', 'Johnson', 'Williams'][($i - 1) % 4] : null,
                'country' => $i % 3 == 0 ? ['USA', 'UK', 'Canada', 'Australia'][($i - 1) % 4] : null,
                'email' => $i % 3 == 0 ? "user{$i}@example.com" : null,
                'phone_number' => $i % 3 == 0 ? '+1' . rand(2000000000, 9999999999) : null,
                'address' => $i % 3 == 0 ? "{$i} Main Street" : null,
                'date_of_birth' => $i % 3 == 0 ? now()->subYears(rand(18, 65))->format('Y-m-d') : null,
                'id_type' => $i % 3 == 0 ? ['passport', 'driver_license', 'id_card'][($i - 1) % 3] : null,
                'id_number' => $i % 3 == 0 ? 'ID' . str_pad($i, 8, '0', STR_PAD_LEFT) : null,
            ]);

            // Привязываем категории, инструменты и документации
            $task->categories()->attach([$template->category_id]);
            if (count($tools) > 0) {
                $task->tools()->attach($tools[rand(0, count($tools) - 1)]->id);
            }
            if (count($docPages) > 0 && $i % 2 == 0) {
                $task->documentations()->attach($docPages[rand(0, count($docPages) - 1)]->id);
            }

            $tasks[] = $task;
        }

        // 10. Создаем назначения задач
        $this->command->info('🔟 Создание назначений задач...');
        foreach ($tasks as $index => $task) {
            if ($task->assigned_to) {
                TaskAssignment::firstOrCreate([
                    'task_id' => $task->id,
                    'assigned_to' => $task->assigned_to,
                ], [
                    'assigned_by' => $index % 2 == 0 ? $admin->id : $testAdmin->id,
                    'assigned_at' => $task->assigned_at ?? now()->subDays(rand(1, 10)),
                    'started_at' => in_array($task->status, ['in_progress', 'completed_by_moderator', 'under_admin_review', 'approved']) ? now()->subDays(rand(1, 5)) : null,
                    'completed_at' => in_array($task->status, ['completed_by_moderator', 'under_admin_review', 'approved']) ? now()->subDays(rand(1, 3)) : null,
                ]);
            }
        }

        // 11. Создаем результаты задач
        $this->command->info('1️⃣1️⃣ Создание результатов задач...');
        foreach ($tasks as $task) {
            if (in_array($task->status, ['completed_by_moderator', 'under_admin_review', 'approved', 'rejected'])) {
                TaskResult::firstOrCreate(['task_id' => $task->id], [
                    'moderator_id' => $task->assigned_to,
                    'answers' => json_encode(['answer1' => 'Response 1', 'answer2' => 'Response 2']),
                    'screenshots' => ['/storage/screenshots/screenshot1.png', '/storage/screenshots/screenshot2.png'],
                    'attachments' => ['/storage/attachments/file1.pdf'],
                    'moderator_comment' => 'Task completed successfully',
                    'admin_comment' => $task->status === 'approved' ? 'Approved' : ($task->status === 'rejected' ? 'Rejected: needs revision' : null),
                ]);
            }
        }

        // 12. Создаем заработки модераторов
        $this->command->info('1️⃣2️⃣ Создание заработков модераторов...');
        foreach ($tasks as $task) {
            if ($task->status === 'approved' && $task->assigned_to) {
                ModeratorEarning::firstOrCreate([
                    'moderator_id' => $task->assigned_to,
                    'task_id' => $task->id,
                ], [
                    'amount' => $task->price,
                    'earned_at' => $task->completed_at ?? now()->subDays(rand(1, 5)),
                    'notes' => "Payment for task: {$task->title}",
                ]);
            }
        }

        // 13. Создаем уровни тестов
        $this->command->info('1️⃣3️⃣ Создание уровней тестов...');
        $testLevels = [];
        $levelData = [
            ['name' => 'Beginner', 'order' => 1],
            ['name' => 'Intermediate', 'order' => 2],
            ['name' => 'Advanced', 'order' => 3],
            ['name' => 'Expert', 'order' => 4],
        ];

        foreach ($levelData as $levelInfo) {
            $testLevel = TestLevel::firstOrCreate([
                'domain_id' => $domain->id,
                'name' => $levelInfo['name'],
            ], [
                'order' => $levelInfo['order'],
            ]);
            $testLevels[] = $testLevel;
        }

        // 14. Создаем тесты
        $this->command->info('1️⃣4️⃣ Создание тестов...');
        $tests = [];
        for ($i = 1; $i <= 8; $i++) {
            $test = Test::firstOrCreate([
                'domain_id' => $domain->id,
                'level_id' => $testLevels[($i - 1) % count($testLevels)]->id,
                'title' => "Test {$i}: " . $testLevels[($i - 1) % count($testLevels)]->name . " Level",
            ], [
                'description' => "Test description for level {$testLevels[($i - 1) % count($testLevels)]->name}",
                'order' => $i,
                'is_active' => true,
            ]);
            $tests[] = $test;
        }

        // 15. Создаем вопросы и ответы тестов
        $this->command->info('1️⃣5️⃣ Создание вопросов и ответов тестов...');
        foreach ($tests as $test) {
            for ($q = 1; $q <= 5; $q++) {
                $question = TestQuestion::firstOrCreate([
                    'test_id' => $test->id,
                    'question' => "Question {$q} for {$test->title}?",
                ], [
                    'order' => $q,
                ]);

                // Создаем 4 ответа для каждого вопроса
                for ($a = 1; $a <= 4; $a++) {
                    TestAnswer::firstOrCreate([
                        'question_id' => $question->id,
                        'answer' => "Answer {$a} for question {$q}",
                    ], [
                        'is_correct' => $a === 1, // Первый ответ правильный
                        'order' => $a,
                    ]);
                }
            }
        }

        // 16. Создаем результаты тестов
        $this->command->info('1️⃣6️⃣ Создание результатов тестов...');
        foreach ($moderators as $moderator) {
            foreach ($tests as $test) {
                if (rand(0, 1)) { // 50% вероятность что модератор прошел тест
                    TestResult::firstOrCreate([
                        'user_id' => $moderator->id,
                        'test_id' => $test->id,
                    ], [
                        'score' => rand(70, 100),
                        'total_questions' => 5,
                        'percentage' => rand(70, 100),
                        'is_passed' => true,
                        'completed_at' => now()->subDays(rand(1, 30)),
                    ]);
                }
            }
        }

        // 17. Создаем вопросы для обучения
        $this->command->info('1️⃣7️⃣ Создание вопросов для обучения...');
        for ($i = 1; $i <= 10; $i++) {
            $moderator = $moderators[($i - 1) % count($moderators)];
            TrainingQuestion::firstOrCreate([
                'domain_id' => $domain->id,
                'moderator_id' => $moderator->id,
                'question' => "Training question {$i}: How to handle situation {$i}?",
            ], [
                'answer' => $i % 2 == 0 ? "Answer to training question {$i}" : null,
                'answered_by' => $i % 2 == 0 ? ($i % 4 == 0 ? $admin->id : $testAdmin->id) : null,
                'answered_at' => $i % 2 == 0 ? now()->subDays(rand(1, 10)) : null,
                'is_resolved' => $i % 2 == 0,
            ]);
        }

        // 18. Создаем обязательные документы
        $this->command->info('1️⃣8️⃣ Создание обязательных документов...');
        $requiredDocs = [];
        $docNames = [
            'Identity Document',
            'Proof of Address',
            'W-4 Form',
            'I-9 Form',
            'Direct Deposit Form',
            'Tax Information',
        ];

        foreach ($docNames as $index => $docName) {
            $requiredDoc = RequiredDocument::firstOrCreate([
                'domain_id' => $domain->id,
                'name' => $docName,
            ], [
                'order' => $index + 1,
                'is_active' => true,
            ]);
            $requiredDocs[] = $requiredDoc;
        }

        // 19. Создаем документы пользователей
        $this->command->info('1️⃣9️⃣ Создание документов пользователей...');
        foreach ($moderators as $moderator) {
            foreach ($requiredDocs as $requiredDoc) {
                if (rand(0, 1)) { // 50% вероятность что документ загружен
                    UserDocument::firstOrCreate([
                        'user_id' => $moderator->id,
                        'required_document_id' => $requiredDoc->id,
                    ], [
                        'file_path' => "/storage/documents/{$requiredDoc->slug}_{$moderator->id}.pdf",
                        'file_name' => "{$requiredDoc->name}.pdf",
                    ]);
                }
            }
        }

        // 20. Создаем тикеты
        $this->command->info('2️⃣0️⃣ Создание тикетов...');
        $ticketStatuses = ['open', 'in_progress', 'resolved', 'closed'];
        $ticketPriorities = ['low', 'medium', 'high', 'urgent'];
        
        for ($i = 1; $i <= 15; $i++) {
            $moderator = $moderators[($i - 1) % count($moderators)];
            Ticket::create([
                'domain_id' => $domain->id,
                'user_id' => $moderator->id,
                'assigned_to' => $i % 2 == 0 ? $admin->id : $testAdmin->id,
                'subject' => "Ticket {$i}: Issue with " . ['verification', 'payment', 'document', 'system'][($i - 1) % 4],
                'description' => "Description of issue {$i}. This is a detailed description of the problem.",
                'status' => $ticketStatuses[($i - 1) % count($ticketStatuses)],
                'priority' => $ticketPriorities[($i - 1) % count($ticketPriorities)],
                'created_at' => now()->subDays(rand(1, 30)),
            ]);
        }

        // 21. Создаем сообщения
        $this->command->info('2️⃣1️⃣ Создание сообщений...');
        for ($i = 1; $i <= 20; $i++) {
            $fromUser = $moderators[($i - 1) % count($moderators)];
            $toUser = $i % 2 == 0 ? $admin : $testAdmin;
            
            Message::create([
                'domain_id' => $domain->id,
                'from_user_id' => $fromUser->id,
                'to_user_id' => $toUser->id,
                'subject' => "Message {$i}: Question about " . ['tasks', 'verification', 'payment', 'system'][($i - 1) % 4],
                'body' => "Body of message {$i}. This is the content of the message.",
                'is_read' => $i % 3 == 0,
                'ticket_id' => $i <= 15 ? $i : null,
                'created_at' => now()->subDays(rand(1, 20)),
            ]);
        }

        // 22. Создаем логи активности
        $this->command->info('2️⃣2️⃣ Создание логов активности...');
        $actions = ['created', 'updated', 'deleted', 'viewed'];
        $eventTypes = ['task', 'user', 'template', 'category'];
        
        for ($i = 1; $i <= 50; $i++) {
            $user = $i % 2 == 0 ? $admin : ($i % 3 == 0 ? $testAdmin : $moderators[($i - 1) % count($moderators)]);
            $task = $tasks[($i - 1) % count($tasks)];
            
            ActivityLog::create([
                'domain_id' => $domain->id,
                'user_id' => $user->id,
                'action' => $actions[($i - 1) % count($actions)],
                'event_type' => $eventTypes[($i - 1) % count($eventTypes)],
                'model_type' => Task::class,
                'model_id' => $task->id,
                'description' => "User {$user->name} {$actions[($i - 1) % count($actions)]} task: {$task->title}",
                'ip_address' => '192.168.1.' . rand(100, 200),
                'user_agent' => 'Mozilla/5.0',
                'created_at' => now()->subDays(rand(1, 30)),
            ]);
        }

        $this->command->info('✅ База данных успешно заполнена тестовыми данными!');
        $this->command->info('');
        $this->command->info('📊 Статистика:');
        $this->command->info("   - Пользователей: " . User::count());
        $this->command->info("   - Задач: " . Task::count());
        $this->command->info("   - Шаблонов: " . TaskTemplate::count());
        $this->command->info("   - Категорий задач: " . TaskCategory::count());
        $this->command->info("   - Тестов: " . Test::count());
        $this->command->info("   - Тикетов: " . Ticket::count());
        $this->command->info("   - Сообщений: " . Message::count());
    }
}
