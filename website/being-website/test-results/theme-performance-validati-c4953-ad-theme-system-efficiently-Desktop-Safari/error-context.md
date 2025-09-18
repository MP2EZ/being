# Page snapshot

```yaml
- generic [ref=e1]:
  - dialog "Unhandled Runtime Error":
    - generic [ref=e3]:
      - generic [ref=e4]:
        - navigation [ref=e5]:
          - button "previous" [disabled] [ref=e6]:
            - img "previous" [ref=e7]
          - button "next" [disabled] [ref=e9]:
            - img "next" [ref=e10]
          - generic [ref=e12]:
            - generic [ref=e13]: "1"
            - text: of
            - generic [ref=e14]: "1"
            - text: error
          - generic [ref=e15]:
            - generic "An outdated version detected (latest is 15.5.2), upgrade is highly recommended!" [ref=e17]: Next.js (14.2.32) is outdated
            - link "(learn more)" [ref=e18]:
              - /url: https://nextjs.org/docs/messages/version-staleness
        - button "Close" [ref=e19] [cursor=pointer]:
          - img [ref=e21] [cursor=pointer]
      - heading "Unhandled Runtime Error" [level=1] [ref=e24]
      - paragraph [ref=e25]: "ReferenceError: Can't find variable: setIsThemeTransitioning"
```