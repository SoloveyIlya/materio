<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Task;

echo "=== Last 10 Tasks ===\n\n";

$tasks = Task::orderBy('created_at', 'desc')
    ->limit(10)
    ->get(['id', 'title', 'work_day', 'domain_id', 'status', 'created_at']);

if ($tasks->isEmpty()) {
    echo "No tasks found.\n";
} else {
    foreach ($tasks as $task) {
        echo "ID: {$task->id}\n";
        echo "Title: {$task->title}\n";
        echo "work_day: " . ($task->work_day ?? 'NULL') . " (type: " . gettype($task->work_day) . ")\n";
        echo "domain_id: {$task->domain_id}\n";
        echo "status: {$task->status}\n";
        echo "created_at: {$task->created_at}\n";
        echo "---\n";
    }
}

echo "\n=== Tasks with work_day = 1 ===\n\n";

$day1Tasks = Task::where('work_day', 1)
    ->orderBy('created_at', 'desc')
    ->get(['id', 'title', 'work_day', 'domain_id', 'status', 'created_at']);

if ($day1Tasks->isEmpty()) {
    echo "No tasks with work_day = 1 found.\n";
} else {
    foreach ($day1Tasks as $task) {
        echo "ID: {$task->id}\n";
        echo "Title: {$task->title}\n";
        echo "work_day: {$task->work_day}\n";
        echo "domain_id: {$task->domain_id}\n";
        echo "status: {$task->status}\n";
        echo "created_at: {$task->created_at}\n";
        echo "---\n";
    }
}

echo "\n=== Tasks with work_day = '1' (string) ===\n\n";

$day1StringTasks = Task::where('work_day', '1')
    ->orderBy('created_at', 'desc')
    ->get(['id', 'title', 'work_day', 'domain_id', 'status', 'created_at']);

if ($day1StringTasks->isEmpty()) {
    echo "No tasks with work_day = '1' (string) found.\n";
} else {
    foreach ($day1StringTasks as $task) {
        echo "ID: {$task->id}\n";
        echo "Title: {$task->title}\n";
        echo "work_day: {$task->work_day} (type: " . gettype($task->work_day) . ")\n";
        echo "domain_id: {$task->domain_id}\n";
        echo "status: {$task->status}\n";
        echo "created_at: {$task->created_at}\n";
        echo "---\n";
    }
}

