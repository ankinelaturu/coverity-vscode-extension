/**
 * Demo: multiple Coverity findings on one source line (rule carousel / Problems count).
 * Pair with CID 90200–90202 in deploy/coverity/coverity-report.txt.
 *
 * Same-column pair: lib/log/log_format.c line 7 (CID 90002 + 90008).
 */
#include <stdio.h>

void coverity_multi_finding_line(int *status, int idx, char *tag)
{
    if (status == NULL || tag == NULL) {
        return;
    }
    *status = idx; tag[idx] = 'A'; (void)printf("%d %s", tag, idx);
}
