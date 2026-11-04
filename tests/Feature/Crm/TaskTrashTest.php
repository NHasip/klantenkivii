<?php

namespace Tests\Feature\Crm;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class TaskTrashTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['crm.require_admin_2fa' => false]);
        $this->resetTrashFlag();
    }

    private function resetTrashFlag(): void
    {
        $prop = new \ReflectionProperty(Task::class, 'trashColumn');
        $prop->setValue(null, null);
        Task::clearBootedModels();
    }

    private function user(string $role = 'medewerker'): User
    {
        return User::factory()->create(['role' => $role, 'active' => true]);
    }

    private function createTask(User $user, string $titel = 'Testtaak'): int
    {
        $response = $this->actingAs($user)->postJson('/taken/tasks', [
            'titel' => $titel,
            'status' => 'open',
            'prioriteit' => 'normaal',
        ]);
        $response->assertOk();

        return (int) $response->json('task.id');
    }

    private function dataIds(User $user): array
    {
        $response = $this->actingAs($user)->getJson('/taken/data');
        $response->assertOk();

        return collect($response->json('tasks') ?? $response->json('initial.tasks') ?? [])->pluck('id')->all();
    }

    public function test_pages_load(): void
    {
        $user = $this->user();
        $this->createTask($user);

        $this->actingAs($user)->get('/taken')->assertOk();
        $this->actingAs($user)->getJson('/taken/data')->assertOk();
        $this->actingAs($user)->getJson('/taken/prullenbak')->assertOk();
        $this->actingAs($user)->get('/dashboard')->assertOk();
    }

    public function test_delete_moves_to_trash_and_restore_brings_back(): void
    {
        $user = $this->user();
        $id = $this->createTask($user);

        $this->actingAs($user)->deleteJson("/taken/tasks/{$id}")->assertOk();

        $this->assertNotContains($id, $this->dataIds($user));
        $this->assertSoftDeleted('tasks', ['id' => $id]);
        $this->actingAs($user)->getJson("/taken/{$id}")->assertNotFound();

        $trash = $this->actingAs($user)->getJson('/taken/prullenbak')->assertOk();
        $this->assertSame([$id], collect($trash->json('tasks'))->pluck('id')->all());
        $this->assertFalse($trash->json('can_force_delete'));

        $this->actingAs($user)->patchJson("/taken/prullenbak/{$id}/herstellen")->assertOk();
        $this->assertContains($id, $this->dataIds($user));
        $this->assertSame([], $this->actingAs($user)->getJson('/taken/prullenbak')->json('tasks'));
    }

    public function test_only_admin_can_force_delete(): void
    {
        $user = $this->user();
        $admin = $this->user('admin');
        $id = $this->createTask($user);
        $this->actingAs($user)->deleteJson("/taken/tasks/{$id}")->assertOk();

        $this->actingAs($user)->deleteJson("/taken/prullenbak/{$id}")->assertForbidden();
        $this->assertSoftDeleted('tasks', ['id' => $id]);

        $this->assertTrue($this->actingAs($admin)->getJson('/taken/prullenbak')->json('can_force_delete'));
        $this->actingAs($admin)->deleteJson("/taken/prullenbak/{$id}")->assertOk();
        $this->assertDatabaseMissing('tasks', ['id' => $id]);
    }

    public function test_active_task_cannot_be_restored_or_force_deleted_via_trash(): void
    {
        $admin = $this->user('admin');
        $id = $this->createTask($admin);

        $this->actingAs($admin)->patchJson("/taken/prullenbak/{$id}/herstellen")->assertNotFound();
        $this->actingAs($admin)->deleteJson("/taken/prullenbak/{$id}")->assertNotFound();
        $this->assertDatabaseHas('tasks', ['id' => $id, 'deleted_at' => null]);
    }

    public function test_prune_removes_only_tasks_older_than_60_days_in_trash(): void
    {
        $user = $this->user();
        $old = $this->createTask($user, 'Oud');
        $recent = $this->createTask($user, 'Recent');
        $active = $this->createTask($user, 'Actief');

        Task::whereKey($old)->first()->delete();
        Task::whereKey($recent)->first()->delete();
        Task::withTrashed()->whereKey($old)->update(['deleted_at' => now()->subDays(61)]);
        Task::withTrashed()->whereKey($recent)->update(['deleted_at' => now()->subDays(59)]);

        $this->artisan('model:prune', ['--model' => [Task::class]])->assertSuccessful();

        $this->assertDatabaseMissing('tasks', ['id' => $old]);
        $this->assertSoftDeleted('tasks', ['id' => $recent]);
        $this->assertDatabaseHas('tasks', ['id' => $active, 'deleted_at' => null]);
    }

    public function test_without_migration_pages_still_work_and_delete_is_refused(): void
    {
        $user = $this->user();
        $id = $this->createTask($user);

        Schema::table('tasks', function ($table) {
            $table->dropIndex(['deleted_at']);
            $table->dropColumn('deleted_at');
        });
        $this->resetTrashFlag();

        $this->actingAs($user)->get('/taken')->assertOk();
        $this->assertContains($id, $this->dataIds($user));
        $this->actingAs($user)->getJson("/taken/{$id}")->assertOk();
        $this->actingAs($user)->get('/dashboard')->assertOk();
        $this->actingAs($user)->deleteJson("/taken/tasks/{$id}")->assertStatus(422);
        $this->actingAs($user)->getJson('/taken/prullenbak')->assertStatus(422);
        $this->assertDatabaseHas('tasks', ['id' => $id]);

        $this->artisan('model:prune', ['--model' => [Task::class]])->assertSuccessful();
        $this->assertDatabaseHas('tasks', ['id' => $id]);
    }
}
