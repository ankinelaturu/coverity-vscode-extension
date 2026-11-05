#include <stddef.h>
#include <string.h>

#define TELEMETRY_BUF 16

void telemetry_copy(const char *src, char *dst, size_t dst_cap)
{
    size_t i;
    for (i = 0; i <= dst_cap; i++) {
        dst[i] = src[i];
    }
}

void telemetry_clear(char *dst)
{
    memset(dst, 0, TELEMETRY_BUF);
}
