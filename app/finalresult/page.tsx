import Image from "next/image";
import styled from "styled-components";
import Link from 'next/link'

const ResultPage = styled.div`
  width: 100%;
  min-height: 100vh;
  text-align: center;
  background-color: #ffffff;

  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Header = styled.div`
  width: 100%;
  height: 120px;
  text-align: center;
  background-color: #ffffff;
  border-bottom: 2px solid #000000;
  box-shadow: 0px 7px 10px rgba(0, 0, 0, 0.3);
  font-size: 36px;
  font-weight: bold;

  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;


const DifferentialDiagnosis = styled.div`
  width: 50%;
  background-color: #ffffff;
  border-radius: 25px;
  margin-top: 65px;
  font-weight: bold;
  box-shadow: 0px 0px 15px rgba(0, 0, 0, 0.3);

  display: flex;
  flex-direction: column;
  align-items: center;  
`;

const LinkHome = styled(Link)`
  text-decoration: underline;
  position: absolute;
  margin-left: 80%

`
const BoxTitle = styled.div`
  color: #1B7D7E;
  font-size: 25px;
  text-align: left;
  margin-top: 10px;
  margin-left: 5%;
  width: 100%;
`

const ResultDisplay = styled.div`
  padding-left: 15px;
  padding-top: 10px;
  font-size: 20px;
  margin-top: 30px;
  width: 94%;
  height: 150px;
  text-align: left;
  box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.3);
  border-radius: 25px;
  color: #1B7D7E;
`

const DiseaseName = styled.div`
  color: #000000
`

export default function Home() {
  

  return (
    <ResultPage>
      <Header>
        <Image
          src="/medichain.png"
          alt="Medichain logo"
          width={200}
          height={200}
          style={{ position: "absolute", marginRight: "80%" }}
        />
        Diagnostic Reasoning For Final Results
        <LinkHome href="/">Back to ChatBot</LinkHome>
      </Header>
      <DifferentialDiagnosis>
        <BoxTitle>
          Ranked Output For Differential Diagnosis
        </BoxTitle>
        <ResultDisplay>
          Rank 1
          <DiseaseName>
            Gastric volvulus
          </DiseaseName>
        </ResultDisplay>
        <ResultDisplay>
          Rank 2
        </ResultDisplay>
        <ResultDisplay>
          Rank 3
        </ResultDisplay>
      </DifferentialDiagnosis>
    </ResultPage>
  );
}
