#ifndef NESTED_DEMO_H
#define NESTED_DEMO_H

typedef struct {
  int enable_retry;
} Config;

int dispatch_request(int *buf);
int nested_dispatch(int *buf, const Config *cfg);

#endif
