<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Report;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ReportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Http::fake(); // Expo push is a no-op without push tokens, fake anyway
    }

    private function admin(): User
    {
        return User::factory()->admin()->create();
    }

    // ── Filing ──

    public function test_buyer_can_report_an_order_and_admins_are_notified(): void
    {
        $admin = $this->admin();
        $buyer = User::factory()->buyerIndividual()->create();
        $order = Order::factory()->create(['buyer_id' => $buyer->id]);

        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/reports', [
                'order_id' => $order->id,
                'category' => 'order_issue',
                'description' => 'Ordered last week, still no delivery update.',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('reports', [
            'reporter_id' => $buyer->id,
            'order_id' => $order->id,
            'category' => 'order_issue',
            'status' => 'open',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $admin->id,
            'type' => 'report_filed',
        ]);
    }

    public function test_user_misconduct_report_targets_a_user(): void
    {
        $this->admin();
        $reporter = User::factory()->buyerIndividual()->create();
        $target = User::factory()->farmer()->create();

        $this->actingAs($reporter, 'sanctum')
            ->postJson('/api/reports', [
                'reported_user_id' => $target->id,
                'category' => 'user_misconduct',
                'description' => 'Rude messages off-platform.',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('reports', [
            'reporter_id' => $reporter->id,
            'reported_user_id' => $target->id,
            'category' => 'user_misconduct',
        ]);
    }

    public function test_report_requires_a_subject(): void
    {
        $this->actingAs($this->businessBuyer(), 'sanctum')
            ->postJson('/api/reports', [
                'category' => 'other',
                'description' => 'Something is wrong.',
            ])
            ->assertInvalid(['order_id', 'reported_user_id']);

        $this->assertDatabaseCount('reports', 0);
    }

    public function test_report_requires_a_description(): void
    {
        $order = Order::factory()->create();

        $this->actingAs($this->businessBuyer(), 'sanctum')
            ->postJson('/api/reports', [
                'order_id' => $order->id,
                'category' => 'order_issue',
            ])
            ->assertInvalid(['description']);

        $this->assertDatabaseCount('reports', 0);
    }

    public function test_guests_cannot_file_reports(): void
    {
        $this->postJson('/api/reports', [
            'order_id' => 1,
            'category' => 'other',
            'description' => 'test',
        ])->assertUnauthorized();

        $this->assertDatabaseCount('reports', 0);
    }

    // ── Admin handling ──

    public function test_admin_can_list_and_filter_reports(): void
    {
        $admin = $this->admin();
        $buyer = User::factory()->buyerIndividual()->create();
        $open = Report::create(['reporter_id' => $buyer->id, 'category' => 'order_issue', 'description' => 'Open one', 'status' => 'open']);
        Report::create(['reporter_id' => $buyer->id, 'category' => 'payment', 'description' => 'Handled one', 'status' => 'resolved']);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/reports')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/reports?status=open')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $open->id);
    }

    public function test_admin_resolves_a_report_and_reporter_is_notified(): void
    {
        $admin = $this->admin();
        $reporter = User::factory()->buyerIndividual()->create();
        $report = Report::create(['reporter_id' => $reporter->id, 'category' => 'order_issue', 'description' => 'Problem', 'status' => 'open']);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/reports/{$report->id}", [
                'status' => 'resolved',
                'resolution_note' => 'Contacted the farmer — refund issued.',
            ])
            ->assertOk();

        $fresh = $report->fresh();
        $this->assertSame('resolved', $fresh->status);
        $this->assertSame($admin->id, $fresh->resolved_by);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $reporter->id,
            'type' => 'report_resolved',
        ]);
    }

    public function test_admin_can_dismiss_a_report(): void
    {
        $admin = $this->admin();
        $reporter = User::factory()->buyerIndividual()->create();
        $report = Report::create(['reporter_id' => $reporter->id, 'category' => 'other', 'description' => 'Minor', 'status' => 'open']);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/reports/{$report->id}", [
                'status' => 'dismissed',
                'resolution_note' => 'No violation found.',
            ])
            ->assertOk();

        $this->assertSame('dismissed', $report->fresh()->status);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $reporter->id,
            'type' => 'report_dismissed',
        ]);
    }

    public function test_non_admins_cannot_access_admin_report_endpoints(): void
    {
        $buyer = User::factory()->buyerIndividual()->create();
        $report = Report::create(['reporter_id' => $buyer->id, 'category' => 'other', 'description' => 'Own report', 'status' => 'open']);

        $this->actingAs($buyer, 'sanctum')
            ->getJson('/api/admin/reports')
            ->assertForbidden();

        $this->actingAs($buyer, 'sanctum')
            ->patchJson("/api/admin/reports/{$report->id}", ['status' => 'resolved'])
            ->assertForbidden();
    }

    private function businessBuyer(): User
    {
        return User::factory()->buyerBusiness()->create();
    }
}
