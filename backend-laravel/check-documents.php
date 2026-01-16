<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\RequiredDocument;

echo "=== Checking Required Documents ===\n\n";

$documents = RequiredDocument::all();

if ($documents->isEmpty()) {
    echo "No documents found in database.\n";
} else {
    echo "Found " . $documents->count() . " document(s):\n\n";
    foreach ($documents as $doc) {
        echo "ID: {$doc->id}\n";
        echo "Name: {$doc->name}\n";
        echo "Domain ID: {$doc->domain_id}\n";
        echo "File Path: " . ($doc->file_path ?? 'NULL') . "\n";
        echo "Order: {$doc->order}\n";
        echo "Is Active: " . ($doc->is_active ? 'Yes' : 'No') . "\n";
        echo "Created: {$doc->created_at}\n";
        echo "Updated: {$doc->updated_at}\n";
        echo "---\n\n";
    }
    
    // Проверяем конкретно документ с именем "Documents fasfasf"
    $targetDoc = RequiredDocument::where('name', 'like', '%fasfasf%')->first();
    if ($targetDoc) {
        echo "\n=== Found document with 'fasfasf' in name ===\n";
        echo "ID: {$targetDoc->id}\n";
        echo "Full Name: {$targetDoc->name}\n";
        echo "Updated: {$targetDoc->updated_at}\n";
    } else {
        echo "\n=== No document found with 'fasfasf' in name ===\n";
    }
}
