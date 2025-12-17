<?php

namespace App\Http\Controllers\Moderator;

use App\Http\Controllers\Controller;
use App\Models\Tool;
use Illuminate\Http\Request;

class ToolController extends Controller
{
    public function index(Request $request)
    {
        $tools = Tool::with('guide')
            ->where('domain_id', $request->user()->domain_id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        return response()->json($tools);
    }

    public function show(Request $request, Tool $tool)
    {
        if ($tool->domain_id !== $request->user()->domain_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if (!$tool->is_active) {
            return response()->json(['message' => 'Tool is not active'], 404);
        }

        return response()->json($tool->load('guide'));
    }
}
