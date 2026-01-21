<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $userId;
    public $domainId;
    public $isOnline;
    public $lastSeenAt;

    /**
     * Create a new event instance.
     */
    public function __construct($userId, $domainId, $isOnline, $lastSeenAt = null)
    {
        $this->userId = $userId;
        $this->domainId = $domainId;
        $this->isOnline = $isOnline;
        $this->lastSeenAt = $lastSeenAt;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('domain.' . $this->domainId),
        ];
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'user_id' => $this->userId,
            'is_online' => $this->isOnline,
            'last_seen_at' => $this->lastSeenAt,
        ];
    }

    public function broadcastAs(): string
    {
        return 'user.status.changed';
    }
}
