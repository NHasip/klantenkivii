<?php

namespace App\Services\Security\Passkeys;

use InvalidArgumentException;

class CborDecoder
{
    public static function decode(string $bytes): mixed
    {
        $offset = 0;
        $value = self::decodeItem($bytes, $offset);

        if ($offset !== strlen($bytes)) {
            throw new InvalidArgumentException('CBOR payload bevat extra bytes.');
        }

        return $value;
    }

    /**
     * @return array{0:mixed,1:int}
     */
    public static function decodeWithOffset(string $bytes, int $offset = 0): array
    {
        $value = self::decodeItem($bytes, $offset);

        return [$value, $offset];
    }

    private static function decodeItem(string $bytes, int &$offset): mixed
    {
        if (! isset($bytes[$offset])) {
            throw new InvalidArgumentException('Onverwacht einde van CBOR payload.');
        }

        $initial = ord($bytes[$offset++]);
        $major = $initial >> 5;
        $additional = $initial & 0x1f;

        if ($major <= 1) {
            $number = self::readLength($bytes, $offset, $additional);

            return $major === 0 ? $number : -1 - $number;
        }

        if ($major === 2) {
            $length = self::readLength($bytes, $offset, $additional);

            return self::readBytes($bytes, $offset, $length);
        }

        if ($major === 3) {
            $length = self::readLength($bytes, $offset, $additional);

            return self::readBytes($bytes, $offset, $length);
        }

        if ($major === 4) {
            $length = self::readLength($bytes, $offset, $additional);
            $items = [];
            for ($i = 0; $i < $length; $i++) {
                $items[] = self::decodeItem($bytes, $offset);
            }

            return $items;
        }

        if ($major === 5) {
            $length = self::readLength($bytes, $offset, $additional);
            $map = [];
            for ($i = 0; $i < $length; $i++) {
                $key = self::decodeItem($bytes, $offset);
                $value = self::decodeItem($bytes, $offset);
                $map[$key] = $value;
            }

            return $map;
        }

        if ($major === 6) {
            self::readLength($bytes, $offset, $additional);

            return self::decodeItem($bytes, $offset);
        }

        if ($major === 7) {
            return match ($additional) {
                20 => false,
                21 => true,
                22 => null,
                default => throw new InvalidArgumentException('Onbekend CBOR simple value type.'),
            };
        }

        throw new InvalidArgumentException('Ongeldige CBOR major type.');
    }

    private static function readLength(string $bytes, int &$offset, int $additional): int
    {
        return match (true) {
            $additional < 24 => $additional,
            $additional === 24 => self::readUint($bytes, $offset, 1),
            $additional === 25 => self::readUint($bytes, $offset, 2),
            $additional === 26 => self::readUint($bytes, $offset, 4),
            $additional === 27 => self::readUint($bytes, $offset, 8),
            default => throw new InvalidArgumentException('Indefinite CBOR lengtes worden niet ondersteund.'),
        };
    }

    private static function readUint(string $bytes, int &$offset, int $length): int
    {
        $chunk = self::readBytes($bytes, $offset, $length);
        $value = 0;
        for ($i = 0; $i < $length; $i++) {
            $value = ($value << 8) | ord($chunk[$i]);
        }

        return $value;
    }

    private static function readBytes(string $bytes, int &$offset, int $length): string
    {
        $total = strlen($bytes);
        if ($offset + $length > $total) {
            throw new InvalidArgumentException('CBOR payload is te kort.');
        }

        $chunk = substr($bytes, $offset, $length);
        $offset += $length;

        return $chunk;
    }
}

