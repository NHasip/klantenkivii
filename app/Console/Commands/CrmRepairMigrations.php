<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * Herstelt een onvolledige migrations-tabel (productie draait migraties met --path).
 *
 * Voor elk migratiebestand dat niet in de migrations-tabel staat, wordt de up()-methode als tekst gelezen
 * (er wordt nooit een migratie uitgevoerd):
 * - Schema::create('x'): tabel bestaat en de herkenbare kolommen bestaan -> aanwezig.
 * - Schema::table('x'): alle toegevoegde kolommen bestaan -> aanwezig.
 * - Alles wat niet zeker te controleren is (data-aanpassingen, kolommen verwijderen of hernoemen,
 *   alleen indexen, ruwe SQL, niets herkend) -> onzeker, niet gemarkeerd.
 *
 * Standaard alleen een overzicht; met --apply worden de "aanwezig"-migraties in een nieuwe batch gemarkeerd.
 */
class CrmRepairMigrations extends Command
{
    protected $signature = 'crm:repair-migrations {--apply : Markeer de aanwezige migraties echt in de migrations-tabel}';

    protected $description = 'Controleer welke migraties al in de database staan maar niet in de migrations-tabel, en markeer ze (alleen met --apply).';

    /** Blueprint-methodes die een kolom met de opgegeven naam maken. */
    private const COLUMN_METHODS = [
        'bigIncrements', 'bigInteger', 'binary', 'boolean', 'char', 'date', 'dateTime', 'dateTimeTz', 'decimal', 'double',
        'enum', 'float', 'foreignId', 'foreignUlid', 'foreignUuid', 'geography', 'geometry', 'increments', 'integer',
        'ipAddress', 'json', 'jsonb', 'longText', 'macAddress', 'mediumIncrements', 'mediumInteger', 'mediumText',
        'set', 'smallIncrements', 'smallInteger', 'string', 'text', 'time', 'timeTz', 'timestamp', 'timestampTz',
        'tinyIncrements', 'tinyInteger', 'tinyText', 'unsignedBigInteger', 'unsignedInteger', 'unsignedMediumInteger',
        'unsignedSmallInteger', 'unsignedTinyInteger', 'ulid', 'uuid', 'vector', 'year', 'point', 'polygon',
        'lineString', 'multiPoint', 'multiPolygon', 'multiLineString', 'geometryCollection',
    ];

    /** Blueprint-methodes die wijzigen of verwijderen: niet aan de database af te lezen of het al gebeurd is. */
    private const UNSAFE_METHODS = [
        'dropColumn', 'dropColumns', 'renameColumn', 'change', 'dropForeign', 'dropIndex', 'dropUnique', 'dropPrimary',
        'dropTimestamps', 'dropSoftDeletes', 'dropRememberToken', 'dropMorphs', 'renameIndex', 'rename', 'dropConstrainedForeignId',
        'dropForeignIdFor', 'dropConstrainedForeignIdFor', 'drop', 'dropIfExists',
    ];

    /** Methodes die alleen een index of sleutel maken: niet betrouwbaar te controleren. */
    private const INDEX_METHODS = ['index', 'unique', 'primary', 'foreign', 'fullText', 'spatialIndex', 'rawIndex'];

    /** Tekenen van data-migraties of ruwe SQL in up(). */
    private const DATA_PATTERNS = [
        '/\bDB::(table|statement|unprepared|update|insert|delete|select|raw|transaction)\s*\(/',
        '/->\s*(update|insert|insertOrIgnore|upsert|delete|increment|decrement|each|chunk|chunkById|lazy|lazyById|cursor|save|forceFill)\s*\(/',
        '/\b(?!Schema\b)[A-Z]\w*::(query|where|whereIn|all|create|updateOrCreate|firstOrCreate|withTrashed|chunk|each)\s*\(/',
        '/\b(Crypt|Artisan|Storage|Hash)::/',
        '/\bencrypt(String)?\s*\(/',
        '/\bSchema::(rename|drop|dropIfExists|dropColumns)\s*\(/',
    ];

    public function handle(): int
    {
        $table = $this->migrationsTable();

        try {
            if (! Schema::hasTable($table)) {
                $this->error("De tabel '{$table}' bestaat niet. Draai eerst php artisan migrate:install.");

                return self::FAILURE;
            }
            $ran = DB::table($table)->pluck('migration')->all();
        } catch (Throwable $e) {
            $this->error('De database is niet bereikbaar: '.class_basename($e));

            return self::FAILURE;
        }

        $files = glob(database_path('migrations').DIRECTORY_SEPARATOR.'*.php') ?: [];
        sort($files);
        $ranLookup = array_flip($ran);

        $present = [];
        $uncertain = [];
        foreach ($files as $file) {
            $name = basename($file, '.php');
            if (isset($ranLookup[$name])) {
                continue;
            }

            [$ok, $reason] = $this->inspect((string) file_get_contents($file));
            if ($ok) {
                $present[$name] = $reason;
            } else {
                $uncertain[$name] = $reason;
            }
        }

        $this->line('Migratiebestanden: '.count($files).', al geregistreerd: '.(count($files) - count($present) - count($uncertain)).', niet geregistreerd: '.(count($present) + count($uncertain)).'.');

        if ($present === [] && $uncertain === []) {
            $this->info('Alle migratiebestanden staan in de migrations-tabel. Niets te doen.');

            return self::SUCCESS;
        }

        $apply = (bool) $this->option('apply');

        if ($present !== []) {
            $this->newLine();
            $this->info($apply ? 'Aanwezig, gemarkeerd:' : 'Aanwezig, wordt gemarkeerd (met --apply):');
            foreach ($present as $name => $reason) {
                $this->line("  - {$name}  ({$reason})");
            }
        }

        if ($uncertain !== []) {
            $this->newLine();
            $this->warn('Onzeker, niet gemarkeerd (controleer handmatig en draai zo nodig met --path):');
            foreach ($uncertain as $name => $reason) {
                $this->line("  - {$name}  ({$reason})");
            }
        }

        $this->newLine();
        if (! $apply) {
            $this->line('Samenvatting: '.count($present).' aanwezig, '.count($uncertain).' onzeker. Er is niets gewijzigd (proefdraai). Draai met --apply om te markeren.');

            return self::SUCCESS;
        }

        if ($present === []) {
            $this->line('Samenvatting: 0 aanwezig, '.count($uncertain).' onzeker. Er is niets gemarkeerd.');

            return self::SUCCESS;
        }

        try {
            DB::transaction(function () use ($table, $present) {
                $batch = ((int) DB::table($table)->max('batch')) + 1;
                $existing = array_flip(DB::table($table)->pluck('migration')->all());
                foreach (array_keys($present) as $name) {
                    if (! isset($existing[$name])) {
                        DB::table($table)->insert(['migration' => $name, 'batch' => $batch]);
                    }
                }
            });
        } catch (Throwable $e) {
            $this->error('Markeren mislukt: '.class_basename($e).'. Er is niets gewijzigd.');

            return self::FAILURE;
        }

        $this->info('Samenvatting: '.count($present).' gemarkeerd in een nieuwe batch, '.count($uncertain).' onzeker en niet gemarkeerd.');

        return self::SUCCESS;
    }

    /**
     * @return array{0: bool, 1: string}
     */
    private function inspect(string $source): array
    {
        $code = $this->upBody($this->withoutComments($source));
        if ($code === null) {
            return [false, 'geen up()-methode gevonden'];
        }

        // Lege up() (bijv. een compatibiliteitsbestand): er is niets uit te voeren, dus veilig te markeren.
        if (trim($code) === '') {
            return [true, 'lege migratie, niets uit te voeren'];
        }

        foreach (self::DATA_PATTERNS as $pattern) {
            if (preg_match($pattern, $code)) {
                return [false, 'past data aan of gebruikt ruwe SQL'];
            }
        }

        $blocks = $this->schemaBlocks($code);
        if ($blocks === []) {
            return [false, 'geen Schema::create of Schema::table herkend'];
        }

        $checked = [];
        foreach ($blocks as $block) {
            [$kind, $tableName, $body] = $block;

            foreach (self::UNSAFE_METHODS as $method) {
                if (preg_match('/->\s*'.$method.'\s*\(/', $body)) {
                    return [false, "{$tableName}: {$method}() is niet te controleren"];
                }
            }

            $columns = $this->columns($body);

            if (! Schema::hasTable($tableName)) {
                return [false, "tabel {$tableName} ontbreekt"];
            }

            if ($kind === 'table') {
                if ($columns === []) {
                    $hasIndex = false;
                    foreach (self::INDEX_METHODS as $method) {
                        $hasIndex = $hasIndex || preg_match('/->\s*'.$method.'\s*\(/', $body);
                    }

                    return [false, $hasIndex ? "{$tableName}: alleen indexen of sleutels, niet te controleren" : "{$tableName}: geen kolommen herkend"];
                }
            }

            $missing = array_values(array_filter($columns, fn (string $column) => ! Schema::hasColumn($tableName, $column)));
            if ($missing !== []) {
                return [false, "{$tableName}: kolommen ontbreken: ".implode(', ', $missing)];
            }

            $checked[] = $kind === 'create'
                ? "tabel {$tableName} bestaat".($columns !== [] ? ' met '.count($columns).' kolommen' : '')
                : "{$tableName}: ".implode(', ', $columns).' bestaan';
        }

        return [true, implode('; ', array_unique($checked))];
    }

    /** Broncode zonder commentaar (via de PHP-tokenizer), zodat uitgeschakelde code niet meetelt. */
    private function withoutComments(string $source): string
    {
        try {
            $out = '';
            foreach (token_get_all($source) as $token) {
                if (is_array($token)) {
                    if (in_array($token[0], [T_COMMENT, T_DOC_COMMENT], true)) {
                        $out .= str_contains($token[1], "\n") ? "\n" : ' ';

                        continue;
                    }
                    $out .= $token[1];
                } else {
                    $out .= $token;
                }
            }

            return $out;
        } catch (Throwable) {
            return $source;
        }
    }

    /** Tekst van de up()-methode (tussen de accolades). */
    private function upBody(string $source): ?string
    {
        if (! preg_match('/function\s+up\s*\([^)]*\)\s*(?::\s*\??\w+)?\s*\{/', $source, $m, PREG_OFFSET_CAPTURE)) {
            return null;
        }

        $start = $m[0][1] + strlen($m[0][0]);

        return $this->matchBraces($source, $start - 1);
    }

    /**
     * Alle Schema::create/table-aanroepen met de body van de closure.
     *
     * @return list<array{0: string, 1: string, 2: string}>
     */
    private function schemaBlocks(string $code): array
    {
        $blocks = [];
        $pattern = '/Schema::(?:connection\([^)]*\)->)?(create|table)\s*\(\s*[\'"]([A-Za-z0-9_]+)[\'"]\s*,\s*(?:static\s+)?(?:function\s*\([^)]*\)\s*(?::\s*\w+)?\s*(?:use\s*\([^)]*\)\s*)?\{|fn\s*\([^)]*\)\s*=>)/';

        if (! preg_match_all($pattern, $code, $matches, PREG_SET_ORDER | PREG_OFFSET_CAPTURE)) {
            return [];
        }

        foreach ($matches as $match) {
            $kind = $match[1][0];
            $table = $match[2][0];
            $end = $match[0][1] + strlen($match[0][0]);

            if (str_ends_with($match[0][0], '{')) {
                $body = $this->matchBraces($code, $end - 1) ?? '';
            } else {
                // Arrow function: tot het einde van de aanroep.
                $semi = strpos($code, ';', $end);
                $body = substr($code, $end, $semi === false ? null : $semi - $end);
            }

            $blocks[] = [$kind, $table, $body];
        }

        // Losse Schema::create/table-aanroepen die niet herkend zijn (bijv. met een variabele als tabelnaam).
        $all = preg_match_all('/Schema::(?:connection\([^)]*\)->)?(create|table)\s*\(/', $code);
        if ($all !== count($blocks)) {
            return [];
        }

        return $blocks;
    }

    /** @return list<string> */
    private function columns(string $body): array
    {
        $columns = [];

        if (preg_match_all('/\$\w+->\s*('.implode('|', self::COLUMN_METHODS).')\s*\(\s*[\'"]([A-Za-z0-9_]+)[\'"]/', $body, $m)) {
            array_push($columns, ...$m[2]);
        }

        if (preg_match_all('/\$\w+->\s*id\s*\(\s*(?:[\'"]([A-Za-z0-9_]+)[\'"])?\s*\)/', $body, $m)) {
            foreach ($m[1] as $name) {
                $columns[] = $name !== '' ? $name : 'id';
            }
        }

        if (preg_match('/\$\w+->\s*(timestamps|timestampsTz|nullableTimestamps)\s*\(/', $body)) {
            array_push($columns, 'created_at', 'updated_at');
        }

        if (preg_match_all('/\$\w+->\s*(?:softDeletes|softDeletesTz)\s*\(\s*(?:[\'"]([A-Za-z0-9_]+)[\'"])?/', $body, $m)) {
            foreach ($m[1] as $name) {
                $columns[] = $name !== '' ? $name : 'deleted_at';
            }
        }

        if (preg_match('/\$\w+->\s*rememberToken\s*\(/', $body)) {
            $columns[] = 'remember_token';
        }

        if (preg_match_all('/\$\w+->\s*(?:nullable)?(?:morphs|uuidMorphs|ulidMorphs|numericMorphs)\s*\(\s*[\'"]([A-Za-z0-9_]+)[\'"]/i', $body, $m)) {
            foreach ($m[1] as $name) {
                array_push($columns, $name.'_id', $name.'_type');
            }
        }

        return array_values(array_unique($columns));
    }

    /** Inhoud tussen de accolade op $openPos en de bijbehorende sluitaccolade (strings worden overgeslagen). */
    private function matchBraces(string $code, int $openPos): ?string
    {
        $depth = 0;
        $length = strlen($code);
        $quote = null;

        for ($i = $openPos; $i < $length; $i++) {
            $char = $code[$i];

            if ($quote !== null) {
                if ($char === '\\') {
                    $i++;
                } elseif ($char === $quote) {
                    $quote = null;
                }

                continue;
            }

            if ($char === '\'' || $char === '"') {
                $quote = $char;
            } elseif ($char === '{') {
                $depth++;
            } elseif ($char === '}') {
                $depth--;
                if ($depth === 0) {
                    return substr($code, $openPos + 1, $i - $openPos - 1);
                }
            }
        }

        return null;
    }

    private function migrationsTable(): string
    {
        $config = config('database.migrations');

        return is_array($config) ? (string) ($config['table'] ?? 'migrations') : (string) ($config ?: 'migrations');
    }
}
