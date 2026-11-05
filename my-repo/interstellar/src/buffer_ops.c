#include <stddef.h>
#include <string.h>

#define TELEMETRY_BUF 16

static size_t telemetry_limit(size_t dst_cap)
{
    return dst_cap + 1;
}

static void telemetry_write_at(char *dst, const char *src, size_t idx)
{
    dst[idx] = src[idx];
}

void telemetry_copy(const char *src, char *dst, size_t dst_cap)
{
    size_t i;
    size_t limit = telemetry_limit(dst_cap);

    for (i = 0; i <= limit; i++) {
        telemetry_write_at(dst, src, i);
    }
}

void telemetry_clear(char *dst)
{
    memset(dst, 0, TELEMETRY_BUF);
}
