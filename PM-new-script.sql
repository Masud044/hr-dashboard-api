--
-- Create Schema Script 
--   Database Version          : 19.0.0.0.0 
--   Database Compatible Level : 19.0.0 
--   Script Compatible Level   : 19.0.0 
--   Toad Version              : 12.1.0.22 
--   DB Connect String         : 192.168.1.136:1521/PCDB1 
--   Schema                    : PM 
--   Script Created by         : PM 
--   Script Created at         : 7/2/2026 11:42:11 PM 
--   Physical Location         :  
--   Notes                     :  
--

-- Object Counts: 
--   Directories: 14 
--   Indexes: 46        Columns: 54         
--   Object Privileges: 3 
--   Sequences: 2 
--   Tables: 39         Columns: 409        Constraints: 58     
--   Triggers: 36 


-- "Set define off" turns off substitution variables. 
Set define off; 

--
-- DATA_PUMP_DIR  (Directory) 
--
CREATE OR REPLACE DIRECTORY 
DATA_PUMP_DIR AS 
'/u01/app/oracle/admin/cdb1/dpdump/4D37EB5A06A26043E0638801A8C0C1A5';


--
-- JAVA$JOX$CUJS$DIRECTORY$  (Directory) 
--
CREATE OR REPLACE DIRECTORY 
JAVA$JOX$CUJS$DIRECTORY$ AS 
'/u01/app/oracle/product/19c/dbhome_1/javavm/admin/';


--
-- OPATCH_INST_DIR  (Directory) 
--
CREATE OR REPLACE DIRECTORY 
OPATCH_INST_DIR AS 
'/u01/app/oracle/product/19c/dbhome_1/OPatch';


--
-- OPATCH_LOG_DIR  (Directory) 
--
CREATE OR REPLACE DIRECTORY 
OPATCH_LOG_DIR AS 
'/u01/app/oracle/product/19c/dbhome_1/rdbms/log';


--
-- OPATCH_SCRIPT_DIR  (Directory) 
--
CREATE OR REPLACE DIRECTORY 
OPATCH_SCRIPT_DIR AS 
'/u01/app/oracle/product/19c/dbhome_1/QOpatch';


--
-- ORACLE_BASE  (Directory) 
--
CREATE OR REPLACE DIRECTORY 
ORACLE_BASE AS 
'/u01/app/oracle';


--
-- ORACLE_HOME  (Directory) 
--
CREATE OR REPLACE DIRECTORY 
ORACLE_HOME AS 
'/u01/app/oracle/product/19c/dbhome_1';


--
-- ORACLE_OCM_CONFIG_DIR  (Directory) 
--
CREATE OR REPLACE DIRECTORY 
ORACLE_OCM_CONFIG_DIR AS 
'/u01/app/oracle/product/19c/dbhome_1/ccr/state';


--
-- ORACLE_OCM_CONFIG_DIR2  (Directory) 
--
CREATE OR REPLACE DIRECTORY 
ORACLE_OCM_CONFIG_DIR2 AS 
'/u01/app/oracle/product/19c/dbhome_1/ccr/state';


--
-- SDO_DIR_ADMIN  (Directory) 
--
CREATE OR REPLACE DIRECTORY 
SDO_DIR_ADMIN AS 
'/u01/app/oracle/product/19c/dbhome_1/md/admin';


--
-- SDO_DIR_WORK  (Directory) 
--
CREATE OR REPLACE DIRECTORY 
SDO_DIR_WORK AS 
'';


--
-- SLC_DIR  (Directory) 
--
CREATE OR REPLACE DIRECTORY 
SLC_DIR AS 
'/u01/app/oracle/admin/cdb1/dpdump/';


--
-- XMLDIR  (Directory) 
--
CREATE OR REPLACE DIRECTORY 
XMLDIR AS 
'/u01/app/oracle/product/19c/dbhome_1/rdbms/xml';


--
-- XSDDIR  (Directory) 
--
CREATE OR REPLACE DIRECTORY 
XSDDIR AS 
'/u01/app/oracle/product/19c/dbhome_1/rdbms/xml/schema';


--
-- CHART_OF_ACCOUNT  (Table) 
--
CREATE TABLE PM.CHART_OF_ACCOUNT
(
  ID                 NUMBER                     NOT NULL,
  ACCOUNT_ID         VARCHAR2(10 BYTE),
  ACCOUNT_NAME       VARCHAR2(50 BYTE),
  ACCOUNT_TYPE       NUMBER,
  IS_PARENT          NUMBER                     DEFAULT 0,
  PARENT_ACCOUNT_ID  VARCHAR2(10 BYTE)          DEFAULT 0,
  LEBEL              NUMBER,
  LASTLEVEL          NUMBER,
  AMOUNT             INTEGER,
  ENABLED            NUMBER                     DEFAULT 1,
  UNIT_ID            NUMBER,
  ENTRY_DATE         DATE,
  ENTRY_BY           NUMBER,
  UPDATE_BY          NUMBER,
  UPDATE_DATE        DATE
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- CUSTOMER_INFO  (Table) 
--
CREATE TABLE PM.CUSTOMER_INFO
(
  CUSTOMER_ID     NUMBER,
  CUSTOMER_NAME   VARCHAR2(300 BYTE),
  ENTRY_BY        NUMBER,
  ENTRY_DATE      DATE                          DEFAULT SYSDATE,
  UPDATE_BY       NUMBER,
  UPDATE_DATE     DATE,
  STATUS          NUMBER                        DEFAULT 1,
  PASSWORD        VARCHAR2(255 BYTE),
  ORG_ID          NUMBER,
  ADDRESS         VARCHAR2(1000 BYTE),
  CONTACT_PERSON  VARCHAR2(50 BYTE),
  PHONE           VARCHAR2(50 BYTE),
  EMAIL           VARCHAR2(100 BYTE),
  MOBILE          VARCHAR2(20 BYTE),
  DUE             VARCHAR2(20 BYTE),
  REMARKS         VARCHAR2(1000 BYTE),
  FAX             VARCHAR2(20 BYTE)
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- GLMASTER  (Table) 
--
CREATE TABLE PM.GLMASTER
(
  ID                 NUMBER,
  VOUCHERNO          VARCHAR2(20 BYTE),
  TRANS_DATE         DATE,
  VOUCHER_TYPE       NUMBER,
  ENTRY_BY           NUMBER,
  DESCRIPTION        VARCHAR2(1000 BYTE),
  REFERENCE_NO       VARCHAR2(100 BYTE),
  SUPPORTING         NUMBER,
  CASHACCOUNT        VARCHAR2(20 BYTE),
  POSTED             NUMBER,
  CUSTOMER_ID        NUMBER,
  AUTO_INVOICE       VARCHAR2(40 BYTE),
  STATUS_PAY_RECIVE  NUMBER(38)                 DEFAULT 0,
  UNIT_ID            NUMBER,
  ENTRY_DATE         DATE,
  UPDATE_BY          NUMBER,
  UPDATE_DATE        DATE,
  SUPPLIER_NAME      DATE,
  GL_ENTRY_DATE      DATE
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- HR_EMP_IMGES  (Table) 
--
CREATE TABLE PM.HR_EMP_IMGES
(
  ID         NUMBER,
  PERSON_ID  NUMBER,
  IMAGE      BLOB,
  STATUS     NUMBER
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- INVENTORIES  (Table) 
--
CREATE TABLE PM.INVENTORIES
(
  TID                 NUMBER,
  INVQTY              NUMBER,
  INVTDATE            DATE,
  INVSTATUS           INTEGER,
  GRNNO               VARCHAR2(30 BYTE),
  PONO                NUMBER,
  ITEM                NUMBER,
  PRICE               NUMBER,
  STOREID             NUMBER,
  UNIT                VARCHAR2(10 BYTE),
  INVOICE_STATUS      INTEGER,
  ITEMTYPE            INTEGER,
  UNIT_PRICE          VARCHAR2(10 BYTE),
  ACCOUNTED           INTEGER                   DEFAULT 0,
  SELLING_UNIT_PRICE  NUMBER,
  INVENTORY_TYPE      NUMBER,
  UNIT_ID             NUMBER,
  ENTRY_DATE          DATE                      DEFAULT SYSDATE,
  UPDATE_DATE         DATE                      DEFAULT SYSDATE
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- INV_TYPE  (Table) 
--
CREATE TABLE PM.INV_TYPE
(
  ID          NUMBER,
  DESCRIPTIO  VARCHAR2(50 BYTE)
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- INV_UOM  (Table) 
--
CREATE TABLE PM.INV_UOM
(
  ID    NUMBER,
  NAME  VARCHAR2(20 BYTE)
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- ITEM  (Table) 
--
CREATE TABLE PM.ITEM
(
  ITEM_ID      NUMBER(11),
  NAME         VARCHAR2(1000 BYTE),
  BRAND_ID     VARCHAR2(100 BYTE),
  MODEL        VARCHAR2(50 CHAR),
  ORIGIN_ID    NUMBER,
  TYPE_ID      NUMBER(11),
  CATEGORY_ID  NUMBER,
  COLOR_ID     NUMBER(11),
  SIZE_ID      VARCHAR2(100 BYTE),
  UNIT         VARCHAR2(20 BYTE),
  DESCRIPTION  VARCHAR2(1000 CHAR),
  MIN_LEVEL    NUMBER(11),
  STATUS       NUMBER(11),
  ENTRY_BY     NUMBER(11),
  SUBCAT_ID    NUMBER(11),
  PRICE        NUMBER,
  UNIT_ID      NUMBER
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- ITEM_STOCK  (Table) 
--
CREATE TABLE PM.ITEM_STOCK
(
  ITEM_ID           NUMBER(11),
  STORE_ID          NUMBER(11),
  STOCK_QTY         NUMBER(11),
  MINIMUM_LEVEL     NUMBER(11),
  STATUS            NUMBER(11),
  PRICE             NUMBER,
  LAST_PRICE        NUMBER,
  LAST_UPDATE_DATE  DATE,
  UOM               VARCHAR2(10 BYTE),
  UNIT_ID           NUMBER,
  UPDATE_DATE       DATE                        DEFAULT SYSDATE,
  ENTRY_DATE        DATE                        DEFAULT SYSDATE,
  ENTRY_BY          NUMBER,
  UPDATE_BY         NUMBER,
  BOOKED            NUMBER                      DEFAULT 0
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- MODULES  (Table) 
--
CREATE TABLE PM.MODULES
(
  ID           NUMBER,
  MODULE_NAME  VARCHAR2(100 BYTE)               NOT NULL,
  DESCRIPTION  VARCHAR2(500 BYTE),
  SEQUENCE_NO  NUMBER
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- PERMISSIONS  (Table) 
--
CREATE TABLE PM.PERMISSIONS
(
  ID               NUMBER,
  MODULE_ID        NUMBER                       NOT NULL,
  PERMISSION_CODE  VARCHAR2(100 BYTE)           NOT NULL,
  PERMISSION_NAME  VARCHAR2(200 BYTE)           NOT NULL,
  DESCRIPTION      VARCHAR2(500 BYTE)
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- PM_CALENDAR_T  (Table) 
--
CREATE TABLE PM.PM_CALENDAR_T
(
  DAY_ID               NUMBER,
  DAY                  DATE,
  HOLIDAY_DESCRIPTION  VARCHAR2(200 BYTE),
  WORKING_STATUS       VARCHAR2(200 BYTE),
  LAST_UPDATED_BY      NUMBER,
  LAST_UPDATED_DATE    DATE,
  MONTH_ID             NUMBER,
  DAY_NAME             VARCHAR2(50 BYTE)
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- PM_CONTRACTOR_INFO  (Table) 
--
CREATE TABLE PM.PM_CONTRACTOR_INFO
(
  CONTRATOR_ID    NUMBER,
  CONTRATOR_NAME  VARCHAR2(300 BYTE),
  ENTRY_BY        NUMBER,
  ENTRY_DATE      DATE                          DEFAULT SYSDATE,
  UPDATE_BY       NUMBER,
  UPDATE_DATE     DATE,
  STATUS          NUMBER                        DEFAULT 1,
  ABN             VARCHAR2(100 BYTE),
  LIEC_NO         VARCHAR2(100 BYTE),
  SUBURB          VARCHAR2(100 BYTE),
  POSTCODE        VARCHAR2(50 BYTE),
  STATE           VARCHAR2(50 BYTE),
  ADDRESS         VARCHAR2(1000 BYTE),
  CONTACT_PERSON  VARCHAR2(50 BYTE),
  PHONE           VARCHAR2(50 BYTE),
  EMAIL           VARCHAR2(100 BYTE),
  MOBILE          VARCHAR2(20 BYTE),
  DUE             VARCHAR2(20 BYTE),
  REMARKS         VARCHAR2(1000 BYTE),
  FAX             VARCHAR2(20 BYTE),
  CUSTOMER_TYPE   NUMBER,
  BANK_ACC_NAME   VARCHAR2(300 BYTE),
  BSB             VARCHAR2(100 BYTE),
  AC_NO           VARCHAR2(50 BYTE),
  INSURER         VARCHAR2(100 BYTE),
  POLICY_NUMBER   VARCHAR2(100 BYTE),
  SORT_ID         NUMBER
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- PM_CONTRACTOR_TYPE  (Table) 
--
CREATE TABLE PM.PM_CONTRACTOR_TYPE
(
  ID    NUMBER,
  NAME  VARCHAR2(50 BYTE)
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- PM_CONTRACTOR_TYPE_INFO  (Table) 
--
CREATE TABLE PM.PM_CONTRACTOR_TYPE_INFO
(
  TYPE_ID          NUMBER,
  CONTRUCTOR_ID    NUMBER,
  CONTRUCTOR_TYPE  NUMBER,
  CREATED_BY       NUMBER,
  UPDATE_BY        NUMBER,
  UPDATED_DATE     DATE                         DEFAULT SYSDATE,
  ENTRY_DATE       DATE                         DEFAULT SYSDATE
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- PM_PROJECT  (Table) 
--
CREATE TABLE PM.PM_PROJECT
(
  P_ID                   NUMBER,
  P_NAME                 VARCHAR2(100 BYTE),
  P_TYPE                 VARCHAR2(100 BYTE),
  P_ADDRESS              VARCHAR2(100 BYTE),
  SUBWRB                 VARCHAR2(100 BYTE),
  POSTCODE               VARCHAR2(50 BYTE),
  STATE                  VARCHAR2(50 BYTE),
  USER_ID                NUMBER,
  CREATION_DATE          DATE                   DEFAULT SYSDATE,
  UPDATE_DATE            DATE                   DEFAULT SYSDATE,
  USER_BY                NUMBER,
  UPDATED_BY             NUMBER,
  LOT                    VARCHAR2(100 BYTE),
  DP                     VARCHAR2(50 BYTE),
  INSURANCE_NO           VARCHAR2(50 BYTE),
  P_ENTATIVE_START_DATE  DATE,
  P_TENTATIVE_END_DATE   DATE,
  P_CODE                 VARCHAR2(30 BYTE),
  DESCRIPTION            VARCHAR2(100 BYTE),
  FILE_PATH              VARCHAR2(500 BYTE),
  CERT_UPLOAD_STATUS     VARCHAR2(20 BYTE)      DEFAULT 'PENDING',
  MARGIN_PERCENT         NUMBER                 DEFAULT 10,
  SORT_ORDER             NUMBER,
  ADDRESS                VARCHAR2(255 BYTE),
  STREET                 VARCHAR2(255 BYTE)
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- PM_PROJECT_CONTRACTOR_TYPE  (Table) 
--
CREATE TABLE PM.PM_PROJECT_CONTRACTOR_TYPE
(
  ID                  NUMBER,
  P_ID                NUMBER,
  CONTRACTOR_TYPE_ID  NUMBER,
  CREATION_DATE       DATE                      DEFAULT SYSDATE
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- PM_PROJECT_DOC  (Table) 
--
CREATE TABLE PM.PM_PROJECT_DOC
(
  ID                  NUMBER,
  P_ID                NUMBER,
  CONTRACTOR_TYPE_ID  NUMBER,
  FILE_NAME           VARCHAR2(255 BYTE),
  FILE_PATH           VARCHAR2(500 BYTE),
  MIME_TYPE           VARCHAR2(100 BYTE),
  FILE_SIZE           NUMBER,
  DOC_FILE            BLOB,
  UPLOAD_STATUS       VARCHAR2(20 BYTE)         DEFAULT 'PENDING',
  CREATION_DATE       DATE                      DEFAULT SYSDATE,
  CREATION_BY         NUMBER,
  UPDATED_BY          NUMBER,
  UPDATED_DATE        DATE                      DEFAULT SYSDATE
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- PM_PROJECT_NOTE  (Table) 
--
CREATE TABLE PM.PM_PROJECT_NOTE
(
  NOTE_ID        NUMBER,
  P_ID           NUMBER,
  DESCRIPTION    VARCHAR2(4000 BYTE),
  FILE_PATH      VARCHAR2(500 BYTE),
  CREATED_BY     NUMBER,
  CREATION_DATE  DATE                           DEFAULT SYSDATE
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- PM_PROJECT_NOTE_CONTRACTOR_TYPE  (Table) 
--
CREATE TABLE PM.PM_PROJECT_NOTE_CONTRACTOR_TYPE
(
  NOTE_ID             NUMBER,
  CONTRACTOR_TYPE_ID  NUMBER,
  ID                  NUMBER
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- PM_PROJECT_NOTE_DOC  (Table) 
--
CREATE TABLE PM.PM_PROJECT_NOTE_DOC
(
  ID             NUMBER,
  NOTE_ID        NUMBER,
  DOC_FILE       BLOB,
  FILE_NAME      VARCHAR2(255 BYTE),
  CONTENT_TYPE   VARCHAR2(100 BYTE),
  CREATION_DATE  DATE                           DEFAULT SYSDATE,
  CREATION_BY    NUMBER
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- PM_PROJECT_TYPE  (Table) 
--
CREATE TABLE PM.PM_PROJECT_TYPE
(
  ID           NUMBER,
  NAME         VARCHAR2(100 BYTE),
  DESCRIPTION  VARCHAR2(100 BYTE)
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- PM_SCHEDUL_H  (Table) 
--
CREATE TABLE PM.PM_SCHEDUL_H
(
  H_ID                NUMBER,
  P_ID                NUMBER,
  DESCRIPTION         VARCHAR2(100 BYTE),
  CREATION_BY         NUMBER,
  UPDATED_BY          NUMBER,
  CREATION_DATE       DATE                      DEFAULT SYSDATE,
  UPDATED_DATE        DATE                      DEFAULT SYSDATE,
  PROJECT_START_PLAN  DATE,
  PROJECT_END_PLAN    DATE
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- PM_SCHEDUL_L  (Table) 
--
CREATE TABLE PM.PM_SCHEDUL_L
(
  L_ID                 NUMBER,
  H_ID                 NUMBER,
  C_P_ID               NUMBER,
  DESCRIPTION          VARCHAR2(200 BYTE),
  SCHEDULE_START_DATE  DATE,
  SCHEDULE_END_DATE    DATE,
  CREATION_DATE        DATE                     DEFAULT SYSDATE,
  UPDATED_DATE         DATE                     DEFAULT SYSDATE,
  CREATION_BY          NUMBER,
  UPDATED_BY           NUMBER,
  SORT_ID              NUMBER,
  NUM_OF_DAYS          NUMBER
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- PM_STATEMENT_MAIN  (Table) 
--
CREATE TABLE PM.PM_STATEMENT_MAIN
(
  TXN_ID             NUMBER Generated as Identity ( START WITH 101 MAXVALUE 9999999999999999999999999999 MINVALUE 1 NOCYCLE CACHE 20 NOORDER NOKEEP) NOT NULL,
  UPLOAD_BATCH_ID    NUMBER,
  P_ID               NUMBER,
  TXN_DATE           DATE,
  AMOUNT             NUMBER(12,2),
  DESCRIPTION        VARCHAR2(500 BYTE),
  BALANCE            NUMBER(12,2),
  CATEGORY           VARCHAR2(20 BYTE),
  MATCHED_ADDRESS    VARCHAR2(300 BYTE),
  APPROVED_BY        NUMBER,
  APPROVED_DATE      DATE                       DEFAULT SYSDATE,
  USER_ID            NUMBER,
  CREATION_DATE      DATE                       DEFAULT SYSDATE,
  PROJECT_NAME       VARCHAR2(100 BYTE),
  CONTRACTOR_ID      NUMBER,
  CONTRACTOR_NAME    VARCHAR2(300 BYTE),
  INVOICE_NO         VARCHAR2(100 BYTE),
  INVOICE_FILE       BLOB,
  INVOICE_FILE_NAME  VARCHAR2(255 BYTE),
  INVOICE_FILE_TYPE  VARCHAR2(100 BYTE),
  INVOICE_FILE_SIZE  NUMBER,
  SOURCE_TYPE        VARCHAR2(20 BYTE)          DEFAULT 'BANKING',
  PAYMENT_BY         NUMBER,
  REMARKS            VARCHAR2(1000 BYTE),
  DEBIT              NUMBER,
  CREDIT             NUMBER
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- PM_STATEMENT_STAGING  (Table) 
--
CREATE TABLE PM.PM_STATEMENT_STAGING
(
  STAGING_ID         NUMBER Generated as Identity ( START WITH 8181 MAXVALUE 9999999999999999999999999999 MINVALUE 1 NOCYCLE CACHE 20 NOORDER NOKEEP) NOT NULL,
  UPLOAD_BATCH_ID    NUMBER,
  P_ID               NUMBER,
  TXN_DATE           DATE,
  AMOUNT             NUMBER(12,2),
  DESCRIPTION        VARCHAR2(500 BYTE),
  BALANCE            NUMBER(12,2),
  CATEGORY           VARCHAR2(20 BYTE),
  MATCHED_ADDRESS    VARCHAR2(300 BYTE),
  STATUS             VARCHAR2(20 BYTE)          DEFAULT 'PENDING',
  USER_ID            NUMBER,
  CREATION_DATE      DATE                       DEFAULT SYSDATE,
  PROJECT_NAME       VARCHAR2(100 BYTE),
  CONTRACTOR_ID      NUMBER,
  CONTRACTOR_NAME    VARCHAR2(300 BYTE),
  INVOICE_NO         VARCHAR2(100 BYTE),
  INVOICE_FILE       BLOB,
  INVOICE_FILE_NAME  VARCHAR2(255 BYTE),
  INVOICE_FILE_TYPE  VARCHAR2(100 BYTE),
  INVOICE_FILE_SIZE  NUMBER,
  SOURCE_TYPE        VARCHAR2(20 BYTE)          DEFAULT 'BANKING',
  PAYMENT_BY         VARCHAR2(20 BYTE),
  REMARKS            VARCHAR2(1000 BYTE),
  ENTRY_TYPE         VARCHAR2(10 BYTE)
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- REQDETAIL  (Table) 
--
CREATE TABLE PM.REQDETAIL
(
  TID        NUMBER(11),
  REQID      NUMBER(11),
  ITEMID     NUMBER,
  APP_QTY    NUMBER,
  THAN       NUMBER,
  TOT_QTY    NUMBER,
  REMARKS    VARCHAR2(100 CHAR),
  STATUS     NUMBER(11),
  STORE_ID   NUMBER(11),
  RETURN     NUMBER(4),
  UOM        VARCHAR2(10 BYTE),
  FRM_STORE  NUMBER,
  ACCOUNTED  INTEGER                            DEFAULT 0
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- REQMASTER  (Table) 
--
CREATE TABLE PM.REQMASTER
(
  TID          NUMBER(11),
  TDATE        DATE,
  ENTRY_BY     NUMBER(11),
  STORE_ID     NUMBER(11),
  REMARKS      VARCHAR2(100 CHAR),
  STATUS       NUMBER(4),
  CHALLAN_NO   VARCHAR2(40 BYTE),
  STORE_ID_TO  NUMBER,
  DREIVER_NO   VARCHAR2(30 BYTE),
  VEHICLE_NO   VARCHAR2(30 BYTE),
  ENTRY_DATE   DATE
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- ROLES  (Table) 
--
CREATE TABLE PM.ROLES
(
  ID           NUMBER,
  ROLE_NAME    VARCHAR2(100 BYTE)               NOT NULL,
  DESCRIPTION  VARCHAR2(500 BYTE),
  CREATED_AT   DATE                             DEFAULT SYSDATE
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- ROLE_PERMISSIONS  (Table) 
--
CREATE TABLE PM.ROLE_PERMISSIONS
(
  ID             NUMBER,
  ROLE_ID        NUMBER                         NOT NULL,
  PERMISSION_ID  NUMBER                         NOT NULL,
  GRANTED_BY     NUMBER,
  GRANTED_AT     DATE                           DEFAULT SYSDATE
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- STORES  (Table) 
--
CREATE TABLE PM.STORES
(
  STORE_ID      NUMBER(11),
  STORE_NAME    VARCHAR2(30 CHAR),
  LOCATION      VARCHAR2(20 CHAR),
  STATUS        NUMBER(11),
  ACCOUNTED     NUMBER,
  SALES_STATUS  INTEGER,
  UNIT_ID       NUMBER
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- SUPPLIER_INFO  (Table) 
--
CREATE TABLE PM.SUPPLIER_INFO
(
  SUPPLIER_ID     NUMBER,
  SUPPLIER_NAME   VARCHAR2(300 BYTE),
  ENTRY_BY        NUMBER,
  ENTRY_DATE      DATE                          DEFAULT SYSDATE,
  UPDATE_BY       NUMBER,
  UPDATE_DATE     DATE,
  STATUS          NUMBER                        DEFAULT 1,
  PASSWORD        VARCHAR2(255 BYTE),
  ORG_ID          NUMBER,
  ADDRESS         VARCHAR2(1000 BYTE),
  CONTACT_PERSON  VARCHAR2(50 BYTE),
  PHONE           VARCHAR2(50 BYTE),
  EMAIL           VARCHAR2(100 BYTE),
  MOBILE          VARCHAR2(20 BYTE),
  DUE             VARCHAR2(20 BYTE),
  REMARKS         VARCHAR2(1000 BYTE),
  FAX             VARCHAR2(20 BYTE)
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- USERS  (Table) 
--
CREATE TABLE PM.USERS
(
  ID             NUMBER,
  EMPLOYEE_ID    NUMBER,
  USERNAME       VARCHAR2(100 BYTE)             NOT NULL,
  PASSWORD_HASH  VARCHAR2(500 BYTE)             NOT NULL,
  STATUS         VARCHAR2(20 BYTE)              DEFAULT 'ACTIVE',
  CREATED_AT     DATE                           DEFAULT SYSDATE,
  UPDATED_AT     DATE,
  LOCATION_ID    NUMBER
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- USER_PERMISSIONS  (Table) 
--
CREATE TABLE PM.USER_PERMISSIONS
(
  ID             NUMBER,
  USER_ID        NUMBER                         NOT NULL,
  PERMISSION_ID  NUMBER                         NOT NULL,
  GRANTED_AT     DATE                           DEFAULT SYSDATE
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- USER_ROLES  (Table) 
--
CREATE TABLE PM.USER_ROLES
(
  ID           NUMBER,
  USER_ID      NUMBER                           NOT NULL,
  ROLE_ID      NUMBER                           NOT NULL,
  ASSIGNED_AT  DATE                             DEFAULT SYSDATE
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- COD_PK  (Index) 
--
CREATE UNIQUE INDEX PM.COD_PK ON PM.CHART_OF_ACCOUNT
(ID)
TABLESPACE USERS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- CUSTOMER_INFO_PK  (Index) 
--
CREATE UNIQUE INDEX PM.CUSTOMER_INFO_PK ON PM.CUSTOMER_INFO
(CUSTOMER_ID)
TABLESPACE USERS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- DATA_UK  (Index) 
--
CREATE UNIQUE INDEX PM.DATA_UK ON PM.PM_STATEMENT_STAGING
(DESCRIPTION, TXN_DATE, AMOUNT, BALANCE)
TABLESPACE USERS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- GLMASTER_PK  (Index) 
--
CREATE UNIQUE INDEX PM.GLMASTER_PK ON PM.GLMASTER
(ID)
TABLESPACE USERS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- IDX_MODULES_NAME  (Index) 
--
CREATE UNIQUE INDEX PM.IDX_MODULES_NAME ON PM.MODULES
(MODULE_NAME)
TABLESPACE HCM_DATA
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- IDX_PERMISSIONS_CODE  (Index) 
--
CREATE UNIQUE INDEX PM.IDX_PERMISSIONS_CODE ON PM.PERMISSIONS
(PERMISSION_CODE)
TABLESPACE HCM_DATA
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- IDX_PERMISSIONS_MODULE  (Index) 
--
CREATE INDEX PM.IDX_PERMISSIONS_MODULE ON PM.PERMISSIONS
(MODULE_ID)
TABLESPACE HCM_DATA
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- IDX_ROLES_NAME  (Index) 
--
CREATE UNIQUE INDEX PM.IDX_ROLES_NAME ON PM.ROLES
(ROLE_NAME)
TABLESPACE HCM_DATA
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- IDX_USER_PERMISSIONS_PERM  (Index) 
--
CREATE INDEX PM.IDX_USER_PERMISSIONS_PERM ON PM.USER_PERMISSIONS
(PERMISSION_ID)
TABLESPACE HCM_DATA
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- IDX_USER_PERMISSIONS_USER  (Index) 
--
CREATE INDEX PM.IDX_USER_PERMISSIONS_USER ON PM.USER_PERMISSIONS
(USER_ID)
TABLESPACE HCM_DATA
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- IDX_USER_ROLES_ROLE  (Index) 
--
CREATE INDEX PM.IDX_USER_ROLES_ROLE ON PM.USER_ROLES
(ROLE_ID)
TABLESPACE HCM_DATA
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- IDX_USER_ROLES_USER  (Index) 
--
CREATE INDEX PM.IDX_USER_ROLES_USER ON PM.USER_ROLES
(USER_ID)
TABLESPACE HCM_DATA
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- INVENTORIES_PK  (Index) 
--
CREATE UNIQUE INDEX PM.INVENTORIES_PK ON PM.INVENTORIES
(TID)
TABLESPACE USERS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- INV_TYPE_PK  (Index) 
--
CREATE UNIQUE INDEX PM.INV_TYPE_PK ON PM.INV_TYPE
(ID)
TABLESPACE HCM_DATA
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- ITEM_PK  (Index) 
--
CREATE UNIQUE INDEX PM.ITEM_PK ON PM.ITEM
(ITEM_ID)
TABLESPACE USERS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- ITEM_STOCK_PK  (Index) 
--
CREATE UNIQUE INDEX PM.ITEM_STOCK_PK ON PM.ITEM_STOCK
(STORE_ID, ITEM_ID)
TABLESPACE USERS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- PERDETAILS_PK  (Index) 
--
CREATE UNIQUE INDEX PM.PERDETAILS_PK ON PM.REQDETAIL
(TID)
TABLESPACE HCM_DATA
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- PM_CONSTRATOR_TYPE_PK  (Index) 
--
CREATE UNIQUE INDEX PM.PM_CONSTRATOR_TYPE_PK ON PM.PM_CONTRACTOR_TYPE
(ID)
TABLESPACE USERS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- PM_CONTRACTOR_INFO_PK  (Index) 
--
CREATE UNIQUE INDEX PM.PM_CONTRACTOR_INFO_PK ON PM.PM_CONTRACTOR_INFO
(CONTRATOR_ID)
TABLESPACE USERS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- PM_CONTRACTOR_TYYPE_INFO_PK  (Index) 
--
CREATE UNIQUE INDEX PM.PM_CONTRACTOR_TYYPE_INFO_PK ON PM.PM_CONTRACTOR_TYPE_INFO
(TYPE_ID)
TABLESPACE USERS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- PM_CONTRACT_PK  (Index) 
--
CREATE UNIQUE INDEX PM.PM_CONTRACT_PK ON PM.PM_PROJECT
(P_ID)
TABLESPACE USERS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- PM_PROJECT_DOC_PK  (Index) 
--
CREATE UNIQUE INDEX PM.PM_PROJECT_DOC_PK ON PM.PM_PROJECT_DOC
(ID)
TABLESPACE USERS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- PM_PROJECT_NOTE_PK  (Index) 
--
CREATE UNIQUE INDEX PM.PM_PROJECT_NOTE_PK ON PM.PM_PROJECT_NOTE
(NOTE_ID)
TABLESPACE USERS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- PM_PROJECT_TYPE_PK  (Index) 
--
CREATE UNIQUE INDEX PM.PM_PROJECT_TYPE_PK ON PM.PM_PROJECT_TYPE
(ID)
TABLESPACE USERS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- PM_SCHEDUL_H_PK  (Index) 
--
CREATE UNIQUE INDEX PM.PM_SCHEDUL_H_PK ON PM.PM_SCHEDUL_H
(H_ID)
TABLESPACE USERS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- PM_SCHEDUL_L_PK  (Index) 
--
CREATE UNIQUE INDEX PM.PM_SCHEDUL_L_PK ON PM.PM_SCHEDUL_L
(L_ID)
TABLESPACE USERS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- REQMASTER_PK  (Index) 
--
CREATE UNIQUE INDEX PM.REQMASTER_PK ON PM.REQMASTER
(TID)
TABLESPACE HCM_DATA
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- STORES_PK  (Index) 
--
CREATE UNIQUE INDEX PM.STORES_PK ON PM.STORES
(STORE_ID)
TABLESPACE USERS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- COD_AUTONUMBER  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.COD_AUTONUMBER 
BEFORE INSERT
ON PM.CHART_OF_ACCOUNT REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
begin
  select  COD_SEQ.nextval into :new.ID  from dual;
end;
/


--
-- CONTRACTOR_AUTONUMBER  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.CONTRACTOR_AUTONUMBER 
BEFORE INSERT
ON PM.PM_CONTRACTOR_INFO  REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
begin
  select  CONTRACTOR_SEQ.nextval into :new.CONTRATOR_ID  from dual;
end;
/


--
-- CUST_AUTONUMBER  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.CUST_AUTONUMBER 
BEFORE INSERT
ON PM.CUSTOMER_INFO  REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
begin
  select  CUST_SEQ.nextval into :new.CUSTOMER_ID  from dual;
end;
/


--
-- HGLD_TRI  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.HGLD_TRI 
BEFORE INSERT ON PM.GLMASTER 
FOR EACH ROW
WHEN (
new.ID IS NULL
      )
BEGIN
  SELECT GLD_SEQ.NEXTVAL
  INTO   :new.ID
  FROM   dual;
END;
/


--
-- HR_EMP_IMGES_TRG  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.HR_EMP_IMGES_TRG 
BEFORE INSERT
ON BWA.HR_EMP_IMGES
REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
BEGIN
-- For Toad:  Highlight column ID
  :new.ID := HR_EMP_IMGES_SEQ.nextval;
END HR_EMP_IMGES_TRG;
/


--
-- INVENTORIES_AUTONUMBER  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.INVENTORIES_AUTONUMBER 
BEFORE INSERT
ON PM.INVENTORIES REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
begin
  select  INVENTORIES_SEQ.nextval into :new.TID from dual;
end;
/


--
-- INVENTORIES_UPDATE_STAT  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.INVENTORIES_UPDATE_STAT 
   AFTER UPDATE
   ON PM.INVENTORIES
   REFERENCING NEW AS New OLD AS Old
   FOR EACH ROW
DECLARE
   tmpVar      NUMBER;
   QTY         NUMBER;
   ITEMCOUNT   NUMBER;
   UPRICE      NUMERIC;
   ITEM1       NUMBER;
   STOREID     NUMBER;
   SQTY NUMBER;
   SPRICE NUMERIC;
   WAPRICE NUMERIC;
   QTPRICE NUMERIC;
BEGIN
   ITEMCOUNT := 0;
   QTY := 0;
   UPRICE := 0;
   ITEM1 := 0;
   STOREID := 0;
 
   IF :OLD.INVSTATUS = 1 AND :NEW.INVSTATUS = 2
   THEN
      SELECT COUNT (*)   INTO ITEMCOUNT FROM ITEM_STOCK WHERE ITEM_ID = :NEW.ITEM AND STORE_ID=:NEW.STOREID  ;
      IF ITEMCOUNT = 0       THEN
         INSERT INTO ITEM_STOCK (ITEM_ID,  STORE_ID, STOCK_QTY,  PRICE, UOM, UNIT_ID)  VALUES (:new.item,:NEW.STOREID,:NEW.INVQTY,:NEW.UNIT_PRICE, :NEW.UNIT, :NEW.UNIT_ID);
      ELSE
        SELECT SUM(STOCK_QTY), SUM(STOCK_QTY*PRICE) INTO SQTY,QTPRICE FROM ITEM_STOCK WHERE ITEM_ID = :NEW.ITEM;

        WAPRICE:=(QTPRICE+:NEW.INVQTY*:NEW.UNIT_PRICE)/(SQTY + :NEW.INVQTY);
        UPDATE ITEM_STOCK  SET STOCK_QTY = (SQTY + :NEW.INVQTY), PRICE = WAPRICE  WHERE ITEM_ID = :NEW.ITEM AND STORE_ID = :NEW.STOREID AND  UNIT_ID= :NEW.UNIT_ID;
      END IF;
   END IF;  
EXCEPTION
   WHEN OTHERS
   THEN
      -- CONSIDER LOGGING THE ERROR AND THEN RE-RAISE
      RAISE;
END;
/


--
-- ITEM_TRG  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.ITEM_TRG 
BEFORE INSERT
ON PM.ITEM
REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
BEGIN
-- For Toad:  Highlight column ITEM_ID
  :new.ITEM_ID := ITEM2_SEQ.nextval;
END ITEM_TRG;
/


--
-- PM_CALENDAR_T_TRG  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.PM_CALENDAR_T_TRG
BEFORE INSERT
ON PM.PM_CALENDAR_T
REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
BEGIN
-- For Toad:  Highlight column DAY_ID
  :new.DAY_ID := PM.PM_CALENDAR_T_SEQ.nextval;
END PM_CALENDAR_T_TRG;
/


--
-- PM_CONTRACTOR_TYPE_INFO_TRG  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.PM_CONTRACTOR_TYPE_INFO_TRG
BEFORE INSERT
ON PM.PM_CONTRACTOR_TYPE_INFO
REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
BEGIN
-- For Toad:  Highlight column TYPE_ID
  :new.TYPE_ID := PM_CONTRACTOR_TYPE_INFO2_SEQ.nextval;
END PM_CONTRACTOR_TYPE_INFO_TRG;
/


--
-- PM_CONTRACTOR_TYPE_TRG  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.PM_CONTRACTOR_TYPE_TRG
BEFORE INSERT
ON PM.PM_CONTRACTOR_TYPE
REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
BEGIN
-- For Toad:  Highlight column ID
  :new.ID := PM_CONTRACTOR_TYPE_SEQ.nextval;
END PM_CONTRACTOR_TYPE_TRG;
/


--
-- PM_PROJECT_CONTRACTOR_TYP2_TRG  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.PM_PROJECT_CONTRACTOR_TYP2_TRG
BEFORE INSERT
ON PM.PM_PROJECT_CONTRACTOR_TYPE
REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
BEGIN
-- For Toad:  Highlight column ID
  :new.ID := PM_PROJECT_CONTRACTOR_TYP2_SEQ.nextval;
END PM_PROJECT_CONTRACTOR_TYP2_TRG;
/


--
-- PM_PROJECT_CONTRACTOR_TYPE_TRG  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.PM_PROJECT_CONTRACTOR_TYPE_TRG
BEFORE INSERT
ON PM.PM_PROJECT_CONTRACTOR_TYPE
REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
BEGIN
-- For Toad:  Highlight column ID
  :new.ID := PM_PROJECT_CONTRACTOR_TYPE_SEQ.nextval;
END PM_PROJECT_CONTRACTOR_TYPE_TRG;
/


--
-- PM_PROJECT_DOC_TRG  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.PM_PROJECT_DOC_TRG
BEFORE INSERT
ON PM.PM_PROJECT_DOC
REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
BEGIN
-- For Toad:  Highlight column ID
  :new.ID := PM_PROJECT_DOC_SEQ.nextval;
END PM_PROJECT_DOC_TRG;
/


--
-- PM_PROJECT_NOTE_CONTRACTOR_TRG  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.PM_PROJECT_NOTE_CONTRACTOR_TRG
BEFORE INSERT
ON PM.PM_PROJECT_NOTE_CONTRACTOR_TYPE
REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
BEGIN
-- For Toad:  Highlight column ID
  :new.ID := PM_PROJECT_NOTE_CONTRACTOR_SEQ.nextval;
END PM_PROJECT_NOTE_CONTRACTOR_TRG;
/


--
-- PM_PROJECT_NOTE_DOC_TRG  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.PM_PROJECT_NOTE_DOC_TRG
BEFORE INSERT
ON PM.PM_PROJECT_NOTE_DOC
REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
BEGIN
-- For Toad:  Highlight column ID
  :new.ID := PM_PROJECT_NOTE_DOC_SEQ.nextval;
END PM_PROJECT_NOTE_DOC_TRG;
/


--
-- PM_PROJECT_NOTE_TRG  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.PM_PROJECT_NOTE_TRG
BEFORE INSERT
ON PM.PM_PROJECT_NOTE
REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
BEGIN
-- For Toad:  Highlight column NOTE_ID
  :new.NOTE_ID := PM_PROJECT_NOTE_SEQ.nextval;
END PM_PROJECT_NOTE_TRG;
/


--
-- PM_PROJECT_TYPE_TRG  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.PM_PROJECT_TYPE_TRG
BEFORE INSERT
ON PM.PM_PROJECT_TYPE
REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
BEGIN
-- For Toad:  Highlight column ID
  :new.ID := PM_PROJECT_TYPE_SEQ.nextval;
END PM_PROJECT_TYPE_TRG;
/


--
-- PROJECT_AUTONUMBER  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.PROJECT_AUTONUMBER 
BEFORE INSERT
ON PM.PM_PROJECT  REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
begin
  select  PROJECT_SEQ.nextval into :new.P_ID  from dual;
end;
/


--
-- REQDETAIL_AUTONUMBER  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.REQDETAIL_AUTONUMBER 
BEFORE INSERT
ON PM.REQDETAIL
REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
begin
  select   REQDETAILS_SEQ.nextval into :new.TID from dual;
end;
/


--
-- REQMASTER_AUTONUMBER  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.REQMASTER_AUTONUMBER 
BEFORE INSERT
ON PM.REQMASTER
REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
begin
  select   REQ_SEQ.nextval into :new.TID from dual;
end;
/


--
-- REQUISITION_UPDATE_STAT  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.REQUISITION_UPDATE_STAT 
   AFTER UPDATE
   ON PM.REQDETAIL
   REFERENCING NEW AS New OLD AS Old
   FOR EACH ROW
DECLARE
   tmpVar      NUMBER;
   QTY         NUMBER;
   ITEMCOUNT   NUMBER;
   UPRICE      NUMERIC;
   ITEM1       NUMBER;
   STOREID     NUMBER;
   SQTY NUMBER;
   SPRICE NUMERIC;
   WAPRICE NUMERIC;
   QTPRICE NUMERIC;
   TOT_QTY1 NUMERIC;
BEGIN
   ITEMCOUNT := 0;
   QTY := 0;
   UPRICE := 0;
   ITEM1 := 0;
   STOREID := 0;
   TOT_QTY1 :=0;

   IF :OLD.STATUS = 1 AND :NEW.STATUS = 2
   THEN
      SELECT COUNT (*)   INTO ITEMCOUNT FROM ITEM_STOCK WHERE ITEM_ID = :NEW.ITEMID AND STORE_ID=:NEW.STORE_ID;
      IF ITEMCOUNT = 0       THEN
      
        --SELECT RD.TOT_QTY INTO  TOT_QTY1  FROM REQDETAIL RD WHERE ITEMID = :NEW.ITEMID AND FRM_STORE=:NEW.FRM_STORE;
        SELECT NVL(PRICE, 0)    INTO UPRICE  FROM ITEM_STOCK WHERE ITEM_ID = :NEW.ITEMID AND STORE_ID=:NEW.FRM_STORE;
        
      
         INSERT INTO ITEM_STOCK (ITEM_ID,  STORE_ID, STOCK_QTY,  PRICE)  VALUES (:NEW.ITEMID,:NEW.STORE_ID, :NEW.APP_QTY, UPRICE);
         UPDATE ITEM_STOCK  SET STOCK_QTY =STOCK_QTY-:NEW.APP_QTY  WHERE ITEM_ID = :NEW.ITEMID AND STORE_ID = :NEW.FRM_STORE; 
         
     ELSE
 
        UPDATE ITEM_STOCK  SET STOCK_QTY =STOCK_QTY+:NEW.APP_QTY   WHERE ITEM_ID = :NEW.ITEMID AND STORE_ID = :NEW.STORE_ID; 
        
        UPDATE ITEM_STOCK  SET STOCK_QTY =STOCK_QTY-:NEW.APP_QTY   WHERE ITEM_ID = :NEW.ITEMID AND STORE_ID = :NEW.FRM_STORE; 
        
        
      END IF; 
   END IF;
EXCEPTION
   WHEN OTHERS
   THEN
      -- CONSIDER LOGGING THE ERROR AND THEN RE-RAISE
      RAISE;
END;
/


--
-- SCHEDUL_H_AUTONUMBER  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.SCHEDUL_H_AUTONUMBER 
BEFORE INSERT
ON PM.PM_SCHEDUL_H  REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
begin
  select  SCHEDUL_H_SEQ.nextval into :new.H_ID  from dual;
end;
/


--
-- SCHEDUL_L_AUTONUMBER  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.SCHEDUL_L_AUTONUMBER 
BEFORE INSERT
ON PM.PM_SCHEDUL_L  REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
begin
  select  SCHEDUL_L_SEQ.nextval into :new.L_ID  from dual;
end;
/


--
-- SUPPLIER_AUTONUMBER  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.SUPPLIER_AUTONUMBER 
BEFORE INSERT
ON PM.SUPPLIER_INFO  REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
begin
  select  SUPPLIER_SEQ.nextval into :new.SUPPLIER_ID  from dual;
end;
/


--
-- TRG_MODULES_ID  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.TRG_MODULES_ID 
BEFORE INSERT ON PM.MODULES
FOR EACH ROW
WHEN (
NEW.id IS NULL
      )
BEGIN
    SELECT modules_seq.NEXTVAL INTO :NEW.id FROM dual;
END;
/


--
-- TRG_PERMISSIONS_ID  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.TRG_PERMISSIONS_ID 
BEFORE INSERT ON PM.PERMISSIONS
FOR EACH ROW
WHEN (
NEW.id IS NULL
      )
BEGIN
    SELECT permissions_seq.NEXTVAL INTO :NEW.id FROM dual;
END;
/


--
-- TRG_ROLES_ID  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.TRG_ROLES_ID 
BEFORE INSERT ON PM.ROLES
FOR EACH ROW
WHEN (
NEW.id IS NULL
      )
BEGIN
    SELECT roles_seq.NEXTVAL INTO :NEW.id FROM dual;
END;
/


--
-- TRG_USERS_ID  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.TRG_USERS_ID 
BEFORE INSERT ON PM.USERS
FOR EACH ROW
WHEN (
NEW.id IS NULL
      )
BEGIN
    SELECT users_seq.NEXTVAL INTO :NEW.id FROM dual;
END;
/


--
-- TRG_USERS_PK  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.TRG_USERS_PK 
BEFORE INSERT ON PM.USERS
FOR EACH ROW
BEGIN
   IF :new.id IS NULL THEN
      SELECT seq_users.NEXTVAL INTO :new.id FROM dual;
   END IF;
END;
/


--
-- TRG_USER_PERMISSIONS_ID  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.TRG_USER_PERMISSIONS_ID 
BEFORE INSERT ON PM.USER_PERMISSIONS
FOR EACH ROW
WHEN (
NEW.id IS NULL
      )
BEGIN
    SELECT user_permissions_seq.NEXTVAL INTO :NEW.id FROM dual;
END;
/


--
-- TRG_USER_ROLES_ID  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.TRG_USER_ROLES_ID 
BEFORE INSERT ON PM.USER_ROLES
FOR EACH ROW
WHEN (
NEW.id IS NULL
      )
BEGIN
    SELECT user_roles_seq.NEXTVAL INTO :NEW.id FROM dual;
END;
/


--
-- GLDETAILS  (Table) 
--
CREATE TABLE PM.GLDETAILS
(
  ID               NUMBER,
  GLMASTERID       NUMBER,
  CODE             VARCHAR2(100 BYTE),
  DEBIT            NUMBER,
  CREDIT           NUMBER,
  UNIT_ID          NUMBER,
  ENTRY_DATE       DATE,
  ENTRY_BY         NUMBER,
  UPDATE_DATE      DATE,
  UPDATE_BY        NUMBER,
  CODEDESCRIPTION  VARCHAR2(500 BYTE),
  DEBIT_TAX        NUMBER,
  CREDIT_TAX       NUMBER,
  DESCRIPTION      VARCHAR2(500 BYTE)
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- GLDOC  (Table) 
--
CREATE TABLE PM.GLDOC
(
  ID             NUMBER,
  DOC_FILE       BLOB,
  CREATION_DATE  DATE                           DEFAULT SYSDATE,
  CREATION_BY    NUMBER,
  UPDATED_BY     NUMBER,
  UPDATED_DATE   DATE                           DEFAULT SYSDATE,
  GLMASTERID     NUMBER
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- PM_CONSTRUCTION_PROCESS  (Table) 
--
CREATE TABLE PM.PM_CONSTRUCTION_PROCESS
(
  ID               NUMBER,
  PROCESS_ID       NUMBER,
  SUB_CONTRACT_ID  NUMBER,
  DEPENDENT_ID     NUMBER,
  SORT_ID          NUMBER,
  CREATION_DATE    DATE                         DEFAULT SYSDATE,
  UPDATE_DATE      DATE                         DEFAULT SYSDATE,
  CREATION_BY      NUMBER,
  UPDATED_BY       NUMBER,
  COST             NUMBER,
  CONTRACTOR_ID    NUMBER
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- PM_OWNER_INFO  (Table) 
--
CREATE TABLE PM.PM_OWNER_INFO
(
  ID            NUMBER,
  O_NAME        VARCHAR2(100 BYTE),
  ADDRESS       VARCHAR2(100 BYTE),
  SUBURB        VARCHAR2(100 BYTE),
  POSTCODE      VARCHAR2(100 BYTE),
  STATE         VARCHAR2(10 BYTE),
  EMAIL         VARCHAR2(30 BYTE),
  PHONE         VARCHAR2(30 BYTE),
  PROJECT_ID    NUMBER,
  CREATED_BY    NUMBER,
  UPDATED_BY    NUMBER,
  ENTRY_DATE    DATE                            DEFAULT SYSDATE,
  UPDATED_DATE  DATE                            DEFAULT SYSDATE
)
TABLESPACE USERS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- GLDETAILS_PK  (Index) 
--
CREATE UNIQUE INDEX PM.GLDETAILS_PK ON PM.GLDETAILS
(ID)
TABLESPACE USERS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- GLDOC_PK  (Index) 
--
CREATE UNIQUE INDEX PM.GLDOC_PK ON PM.GLDOC
(ID)
TABLESPACE HCM_DATA
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- GLDOC_UK  (Index) 
--
CREATE UNIQUE INDEX PM.GLDOC_UK ON PM.GLDOC
(ID, GLMASTERID)
TABLESPACE HCM_DATA
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- PM_CONSTRUCTION_PROCESS_PK  (Index) 
--
CREATE UNIQUE INDEX PM.PM_CONSTRUCTION_PROCESS_PK ON PM.PM_CONSTRUCTION_PROCESS
(ID)
TABLESPACE USERS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- PM_OWNER_INFO_PK  (Index) 
--
CREATE UNIQUE INDEX PM.PM_OWNER_INFO_PK ON PM.PM_OWNER_INFO
(ID)
TABLESPACE USERS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- PROJECT_UK  (Index) 
--
CREATE UNIQUE INDEX PM.PROJECT_UK ON PM.PM_CONSTRUCTION_PROCESS
(PROCESS_ID, SUB_CONTRACT_ID)
TABLESPACE USERS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- CON_PROCESS_AUTONUMBER  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.CON_PROCESS_AUTONUMBER 
BEFORE INSERT
ON PM.PM_CONSTRUCTION_PROCESS  REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
begin
  select  CONSTRUCTION_PROCESS_SEQ.nextval into :new.ID  from dual;
end;
/


--
-- GLDETAILS_TRI  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.GLDETAILS_TRI 
BEFORE INSERT ON PM.GLDETAILS 
FOR EACH ROW
WHEN (
new.ID IS NULL
      )
BEGIN
  SELECT GLD_SEQ.NEXTVAL
  INTO   :new.ID
  FROM   dual;
END;
/


--
-- GLDOC_TRI  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.GLDOC_TRI 
BEFORE INSERT ON PM.GLDOC 
FOR EACH ROW
WHEN (
new.ID IS NULL
      )
BEGIN
  SELECT GLDOC_SEQ.NEXTVAL
  INTO   :new.ID
  FROM   dual;
END;
/


--
-- PM_OWNER_INFO_TRG  (Trigger) 
--
CREATE OR REPLACE TRIGGER PM.PM_OWNER_INFO_TRG
BEFORE INSERT
ON PM.PM_OWNER_INFO
REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
BEGIN
-- For Toad:  Highlight column ID
  :new.ID := PM_OWNER_INFO_SEQ.nextval;
END PM_OWNER_INFO_TRG;
/


-- 
-- Non Foreign Key Constraints for Table CHART_OF_ACCOUNT 
-- 
ALTER TABLE PM.CHART_OF_ACCOUNT ADD (
  CONSTRAINT COD_PK
  PRIMARY KEY
  (ID)
  USING INDEX PM.COD_PK
  ENABLE VALIDATE);

ALTER TABLE PM.CHART_OF_ACCOUNT ADD (
  UNIQUE (ACCOUNT_ID, UNIT_ID)
  USING INDEX
    TABLESPACE USERS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                INITIAL          64K
                NEXT             1M
                MAXSIZE          UNLIMITED
                MINEXTENTS       1
                MAXEXTENTS       UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table CUSTOMER_INFO 
-- 
ALTER TABLE PM.CUSTOMER_INFO ADD (
  CONSTRAINT CUSTOMER_INFO_PK
  PRIMARY KEY
  (CUSTOMER_ID)
  USING INDEX PM.CUSTOMER_INFO_PK
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table GLMASTER 
-- 
ALTER TABLE PM.GLMASTER ADD (
  CONSTRAINT GL_H_PK
  PRIMARY KEY
  (ID)
  USING INDEX PM.GLMASTER_PK
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table INV_TYPE 
-- 
ALTER TABLE PM.INV_TYPE ADD (
  CONSTRAINT INV_TYPE_PK
  PRIMARY KEY
  (ID)
  USING INDEX PM.INV_TYPE_PK
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table ITEM 
-- 
ALTER TABLE PM.ITEM ADD (
  CONSTRAINT ITEM_PK
  PRIMARY KEY
  (ITEM_ID)
  USING INDEX PM.ITEM_PK
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table ITEM_STOCK 
-- 
ALTER TABLE PM.ITEM_STOCK ADD (
  CONSTRAINT ITEM_STOCK_PK
  PRIMARY KEY
  (STORE_ID, ITEM_ID)
  USING INDEX PM.ITEM_STOCK_PK
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table MODULES 
-- 
ALTER TABLE PM.MODULES ADD (
  PRIMARY KEY
  (ID)
  USING INDEX
    TABLESPACE HCM_DATA
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                INITIAL          64K
                NEXT             1M
                MAXSIZE          UNLIMITED
                MINEXTENTS       1
                MAXEXTENTS       UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table PERMISSIONS 
-- 
ALTER TABLE PM.PERMISSIONS ADD (
  PRIMARY KEY
  (ID)
  USING INDEX
    TABLESPACE HCM_DATA
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                INITIAL          64K
                NEXT             1M
                MAXSIZE          UNLIMITED
                MINEXTENTS       1
                MAXEXTENTS       UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table PM_CALENDAR_T 
-- 
ALTER TABLE PM.PM_CALENDAR_T ADD (
  PRIMARY KEY
  (DAY_ID)
  USING INDEX
    TABLESPACE USERS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                INITIAL          64K
                NEXT             1M
                MAXSIZE          UNLIMITED
                MINEXTENTS       1
                MAXEXTENTS       UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table PM_CONTRACTOR_INFO 
-- 
ALTER TABLE PM.PM_CONTRACTOR_INFO ADD (
  CONSTRAINT PM_CONTRACTOR_INFO_PK
  PRIMARY KEY
  (CONTRATOR_ID)
  USING INDEX PM.PM_CONTRACTOR_INFO_PK
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table PM_CONTRACTOR_TYPE 
-- 
ALTER TABLE PM.PM_CONTRACTOR_TYPE ADD (
  CONSTRAINT PM_CONSTRATOR_TYPE_PK
  PRIMARY KEY
  (ID)
  USING INDEX PM.PM_CONSTRATOR_TYPE_PK
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table PM_CONTRACTOR_TYPE_INFO 
-- 
ALTER TABLE PM.PM_CONTRACTOR_TYPE_INFO ADD (
  CONSTRAINT PM_CONTRACTOR_TYYPE_INFO_PK
  PRIMARY KEY
  (TYPE_ID)
  USING INDEX PM.PM_CONTRACTOR_TYYPE_INFO_PK
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table PM_PROJECT 
-- 
ALTER TABLE PM.PM_PROJECT ADD (
  CONSTRAINT PM_CONTRACT_PK
  PRIMARY KEY
  (P_ID)
  USING INDEX PM.PM_CONTRACT_PK
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table PM_PROJECT_DOC 
-- 
ALTER TABLE PM.PM_PROJECT_DOC ADD (
  CONSTRAINT PM_PROJECT_DOC_PK
  PRIMARY KEY
  (ID)
  USING INDEX PM.PM_PROJECT_DOC_PK
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table PM_PROJECT_NOTE 
-- 
ALTER TABLE PM.PM_PROJECT_NOTE ADD (
  CONSTRAINT PM_PROJECT_NOTE_PK
  PRIMARY KEY
  (NOTE_ID)
  USING INDEX PM.PM_PROJECT_NOTE_PK
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table PM_PROJECT_TYPE 
-- 
ALTER TABLE PM.PM_PROJECT_TYPE ADD (
  CONSTRAINT PM_PROJECT_TYPE_PK
  PRIMARY KEY
  (ID)
  USING INDEX PM.PM_PROJECT_TYPE_PK
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table PM_SCHEDUL_H 
-- 
ALTER TABLE PM.PM_SCHEDUL_H ADD (
  CONSTRAINT PM_SCHEDUL_H_PK
  PRIMARY KEY
  (H_ID)
  USING INDEX PM.PM_SCHEDUL_H_PK
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table PM_SCHEDUL_L 
-- 
ALTER TABLE PM.PM_SCHEDUL_L ADD (
  CONSTRAINT PM_SCHEDUL_L_PK
  PRIMARY KEY
  (L_ID)
  USING INDEX PM.PM_SCHEDUL_L_PK
  ENABLE VALIDATE);

ALTER TABLE PM.PM_SCHEDUL_L ADD (
  CONSTRAINT SU_UK
  UNIQUE (H_ID, C_P_ID)
  DISABLE NOVALIDATE);


-- 
-- Non Foreign Key Constraints for Table PM_STATEMENT_MAIN 
-- 
ALTER TABLE PM.PM_STATEMENT_MAIN ADD (
  PRIMARY KEY
  (TXN_ID)
  USING INDEX
    TABLESPACE USERS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                INITIAL          64K
                NEXT             1M
                MAXSIZE          UNLIMITED
                MINEXTENTS       1
                MAXEXTENTS       UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table PM_STATEMENT_STAGING 
-- 
ALTER TABLE PM.PM_STATEMENT_STAGING ADD (
  PRIMARY KEY
  (STAGING_ID)
  USING INDEX
    TABLESPACE USERS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                INITIAL          64K
                NEXT             1M
                MAXSIZE          UNLIMITED
                MINEXTENTS       1
                MAXEXTENTS       UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);

ALTER TABLE PM.PM_STATEMENT_STAGING ADD (
  CONSTRAINT DATA_UK
  UNIQUE (DESCRIPTION, TXN_DATE, AMOUNT, BALANCE)
  USING INDEX PM.DATA_UK
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table REQMASTER 
-- 
ALTER TABLE PM.REQMASTER ADD (
  CONSTRAINT REQMASTER_PK
  PRIMARY KEY
  (TID)
  USING INDEX PM.REQMASTER_PK
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table ROLES 
-- 
ALTER TABLE PM.ROLES ADD (
  PRIMARY KEY
  (ID)
  USING INDEX
    TABLESPACE HCM_DATA
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                INITIAL          64K
                NEXT             1M
                MAXSIZE          UNLIMITED
                MINEXTENTS       1
                MAXEXTENTS       UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table STORES 
-- 
ALTER TABLE PM.STORES ADD (
  CONSTRAINT STORES_PK
  PRIMARY KEY
  (STORE_ID)
  USING INDEX PM.STORES_PK
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table USERS 
-- 
ALTER TABLE PM.USERS ADD (
  PRIMARY KEY
  (ID)
  USING INDEX
    TABLESPACE HCM_DATA
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                INITIAL          64K
                NEXT             1M
                MAXSIZE          UNLIMITED
                MINEXTENTS       1
                MAXEXTENTS       UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);

ALTER TABLE PM.USERS ADD (
  UNIQUE (USERNAME)
  USING INDEX
    TABLESPACE HCM_DATA
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                INITIAL          64K
                NEXT             1M
                MAXSIZE          UNLIMITED
                MINEXTENTS       1
                MAXEXTENTS       UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table USER_PERMISSIONS 
-- 
ALTER TABLE PM.USER_PERMISSIONS ADD (
  PRIMARY KEY
  (ID)
  USING INDEX
    TABLESPACE HCM_DATA
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                INITIAL          64K
                NEXT             1M
                MAXSIZE          UNLIMITED
                MINEXTENTS       1
                MAXEXTENTS       UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table USER_ROLES 
-- 
ALTER TABLE PM.USER_ROLES ADD (
  PRIMARY KEY
  (ID)
  USING INDEX
    TABLESPACE HCM_DATA
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                INITIAL          64K
                NEXT             1M
                MAXSIZE          UNLIMITED
                MINEXTENTS       1
                MAXEXTENTS       UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table GLDETAILS 
-- 
ALTER TABLE PM.GLDETAILS ADD (
  CONSTRAINT GLDETAILS_PK
  PRIMARY KEY
  (ID)
  USING INDEX PM.GLDETAILS_PK
  ENABLE VALIDATE);

ALTER TABLE PM.GLDETAILS ADD (
  UNIQUE (GLMASTERID, CODE)
  USING INDEX
    TABLESPACE USERS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                INITIAL          64K
                NEXT             1M
                MAXSIZE          UNLIMITED
                MINEXTENTS       1
                MAXEXTENTS       UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table PM_CONSTRUCTION_PROCESS 
-- 
ALTER TABLE PM.PM_CONSTRUCTION_PROCESS ADD (
  CONSTRAINT PM_CONSTRUCTION_PROCESS_PK
  PRIMARY KEY
  (ID)
  USING INDEX PM.PM_CONSTRUCTION_PROCESS_PK
  ENABLE VALIDATE);

ALTER TABLE PM.PM_CONSTRUCTION_PROCESS ADD (
  CONSTRAINT PROJECT_UK
  UNIQUE (PROCESS_ID, SUB_CONTRACT_ID)
  USING INDEX PM.PROJECT_UK
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table PM_OWNER_INFO 
-- 
ALTER TABLE PM.PM_OWNER_INFO ADD (
  CONSTRAINT PM_OWNER_INFO_PK
  PRIMARY KEY
  (ID)
  USING INDEX PM.PM_OWNER_INFO_PK
  ENABLE VALIDATE);


-- 
-- Foreign Key Constraints for Table PM_SCHEDUL_L 
-- 
ALTER TABLE PM.PM_SCHEDUL_L ADD (
  CONSTRAINT SL_FK 
  FOREIGN KEY (H_ID) 
  REFERENCES PM.PM_SCHEDUL_H (H_ID)
  ENABLE VALIDATE);


-- 
-- Foreign Key Constraints for Table USER_PERMISSIONS 
-- 
ALTER TABLE PM.USER_PERMISSIONS ADD (
  CONSTRAINT FK_USER_PERMISSIONS_PERM 
  FOREIGN KEY (PERMISSION_ID) 
  REFERENCES PM.PERMISSIONS (ID)
  ENABLE VALIDATE);

ALTER TABLE PM.USER_PERMISSIONS ADD (
  CONSTRAINT FK_USER_PERMISSIONS_USER 
  FOREIGN KEY (USER_ID) 
  REFERENCES PM.USERS (ID)
  ENABLE VALIDATE);


-- 
-- Foreign Key Constraints for Table GLDETAILS 
-- 
ALTER TABLE PM.GLDETAILS ADD (
  CONSTRAINT GL_FK 
  FOREIGN KEY (GLMASTERID) 
  REFERENCES PM.GLMASTER (ID)
  ENABLE VALIDATE);


-- 
-- Foreign Key Constraints for Table GLDOC 
-- 
ALTER TABLE PM.GLDOC ADD (
  CONSTRAINT GLDOC_GK 
  FOREIGN KEY (GLMASTERID) 
  REFERENCES PM.GLMASTER (ID)
  ENABLE VALIDATE);


-- 
-- Foreign Key Constraints for Table PM_CONSTRUCTION_PROCESS 
-- 
ALTER TABLE PM.PM_CONSTRUCTION_PROCESS ADD (
  CONSTRAINT PROJECT_SUB_FK 
  FOREIGN KEY (PROCESS_ID) 
  REFERENCES PM.PM_PROJECT (P_ID)
  ENABLE VALIDATE);


-- 
-- Foreign Key Constraints for Table PM_OWNER_INFO 
-- 
ALTER TABLE PM.PM_OWNER_INFO ADD (
  CONSTRAINT PM_OWNER_FK 
  FOREIGN KEY (PROJECT_ID) 
  REFERENCES PM.PM_PROJECT (P_ID)
  ENABLE VALIDATE);


GRANT READ, WRITE ON DIRECTORY DATA_PUMP_DIR TO EXP_FULL_DATABASE;

GRANT READ, WRITE ON DIRECTORY SLC_DIR TO HCM;

GRANT READ, WRITE ON DIRECTORY DATA_PUMP_DIR TO IMP_FULL_DATABASE;