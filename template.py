def pdf2(image_url,df,from_date, to_date):
    return """<!DOCTYPE html>
                            <html lang="en">
                            <head>
                                <meta charset="UTF-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                <title>Statement of Account</title>
                                <style>
                                    body {{
                                        font-family: Arial, sans-serif;
                                        margin: 0;
                                        padding: 20px;
                                    }}
                                    header {{
                                        display: grid;
                                        align-items: center;
                                        margin-bottom: 20px;
                                        border-bottom: 2px solid #000; /* Optional: Adds a bottom border */
                                        padding-bottom: 10px;
                                    }}
                                    .header {{
                                        display: flex;
                                        align-items: bottom;
                                    }}
                                    .header img {{
                                        height: 100px;
                                    }}
                                    .address {{
                                        font-size: 14px;
                                        text-align: right;
                                        line-height: 1.5;
                                    }}
                                    .statement-info {{
                                        margin-bottom: 20px;
                                    }}
                                    .statement-info table, .transactions-table {{
                                        width: 100%;
                                        border-collapse: collapse;
                                    }}
                                    .statement-info th, .statement-info td, .transactions-table th, .transactions-table td {{
                                        border: 1px solid #ddd;
                                        padding: 8px;
                                        text-align: left;
                                    }}
                                    .statement-info th, .transactions-table th {{
                                        background-color: #f2f2f2;
                                    }}
                                </style>
                            </head>
                            <body>
                                <header>
                                    <div class="header">
                                        <img src="{image_url}" alt="Company Logo">
                                    </div>
                                    <div class="address">
                                        <h1>Statement of Account</h1>
                                        <div>
                                            36 DELTA DALHIA<br>
                                            KEMAL ATATURK AVENUE<br>
                                            BANANI, DHAKA-1213
                                        </div>
                                    </div>
                                </header>
                                <div class="statement-info">
                                    <div class=info>
                                        <h2>ATIF RONAN</h2>
                                    </div>
                                    <table>
                                        <tr><th>Statement Generation Date</th><td>10-Mar-2025 02:40:21 PM</td></tr>
                                        <tr><th>Statement Period</th><td>{escape(from_date)} TO {escape(to_date)}</td></tr>
                                        <tr><th>Account No.</th><td>01794747109</td></tr>
                                        <tr><th>Account Type</th><td>CUSTOMER</td></tr>
                                        <tr><th>Account Status</th><td>ACTIVE</td></tr>
                                        <tr><th>Registration Date</th><td>02-Jan-2025 10:31:09 AM</td></tr>
                                        <tr><th>Last KYC Status</th><td>CS RECEIVED</td></tr>
                                    </table>
                                </div>
                                <h2>Transaction Details</h2>
                                <table class="transactions-table">
                                    <tr>
                                        {"".join([f"<th>{escape(col)}</th>" for col in df.columns])}
                                    </tr>
                                    {"".join([f"<tr>{''.join([f'<td>{escape(val)}</td>' for val in row])}</tr>" for row in df.values])}
                                </table>
                            </body>
                            </html>"""