/* Synthetic fixture for nested Coverity trace steps (CID 90100). */
#include "nested_demo.h"

int nested_dispatch(int *buf, const Config *cfg) {
  if (cfg->enable_retry) {
    int retry_count = 0;
    (void)retry_count;
  }
  int status = dispatch_request(buf);
  if (buf == 0) {
    return status;
  }
  return *buf;
}
