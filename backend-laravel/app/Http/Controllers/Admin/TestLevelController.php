<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TestLevel;
use Illuminate\Http\Request;

class TestLevelController extends Controller
{
    public function index(Request $request)
    {
        $levels = TestLevel::where('domain_id', $request->user()->domain_id)
            ->orderBy('order')
            ->get();

        return response()->json($levels);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'order' => 'nullable|integer|min:0',
        ]);

        $validated['domain_id'] = $request->user()->domain_id;
        $validated['order'] = $validated['order'] ?? 0;

        $level = TestLevel::create($validated);

        return response()->json($level, 201);
    }

    public function show(Request $request, TestLevel $testLevel)
    {
        if ($testLevel->domain_id !== $request->user()->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json($testLevel);
    }

    public function update(Request $request, TestLevel $testLevel)
    {
        if ($testLevel->domain_id !== $request->user()->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'order' => 'nullable|integer|min:0',
        ]);

        $testLevel->update($validated);

        return response()->json($testLevel);
    }

    public function destroy(Request $request, TestLevel $testLevel)
    {
        if ($testLevel->domain_id !== $request->user()->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $testLevel->delete();

        return response()->json(null, 204);
    }
}
